# MediKiosk Database Architecture

Audited live against Supabase project `lkywtyursgbnvdxvtime` (2026-09-10).
Column existence was probed per-column through PostgREST; types were inferred
from operator behaviour (`ilike` works on text, `42883` = not text).
`patients` row contents could not be listed: the anon key is denied by RLS.

Canonical rule: **ONE kiosk session = ONE `patients.id` UUID.**
Every patient-specific row references that UUID. Names, codes, phones,
Aadhaar/ABHA values are never relational keys.

## Tables

### `patients` — CORE
One row per kiosk registration. Created once (`POST /api/patients`),
later details arrive via `PATCH /api/patients/:id` (never a 2nd INSERT).

| column | type (inferred) |
|---|---|---|
| id | uuid PK |
| patient_code | text (display UHID) |
| name | text |
| full_name | text (nullable) |
| age | integer |
| gender | text |
| phone | text (nullable) |
| phone_number | text (nullable) |
| abha_number | text (nullable) |
| aadhaar_id | text (nullable) |
| date_of_birth | date (nullable, `YYYY-MM-DD`) |
| preferred_language | text (nullable) |
| created_at / updated_at | timestamptz |

Writers: `POST /api/patients`, `PATCH /api/patients/:id`.
Readers: `GET /api/patients/:id`, `POST /api/patients/identify`,
`GET /api/staff/patients`, `GET /api/staff/patients/:id`.

### `interview_sessions` — CORE
One row per kiosk visit (`status='in_progress'` while active).
Created once by `POST /api/interview/session` (reuses the open session),
closed by `POST /api/interview/session/:id/complete`.

| column | type |
|---|---|
| id | uuid PK |
| patient_id | uuid → `patients.id` |
| status | text (`in_progress` / `completed`) |
| care_mode | text (`allopathy` / `ayush`, nullable) |
| created_at / updated_at | timestamptz |

### `interview_responses` — CORE
One current row per session + question (re-answering UPDATEs).
`answer` is text: option taps store a JSON array string (`["moderate"]`),
free-form voice stores the raw transcript verbatim.

| column | type |
|---|---|
| id | uuid PK |
| session_id | uuid → `interview_sessions.id` |
| question_key | text (e.g. `chief_complaint`, AYUSH keys, see `kiosk-data.ts`) |
| answer | text |
| created_at / updated_at | timestamptz |

Writers: `POST /api/interview/response` (manual upsert, no UNIQUE
constraint is assumed). Readers: `GET /api/interview/session/:id/responses`.

### `clinical_summaries` — CORE
One row per generated doctor summary (jsonb payload, object — never a
pre-stringified string).

| column | type |
|---|---|
| id | uuid PK |
| patient_id | uuid → `patients.id` |
| session_id | uuid → `interview_sessions.id` (nullable) |
| summary | jsonb `{ patientLanguage, careMode, shareScope, patientSummary, doctorSummary, generatedAt }` |
| created_at / updated_at | timestamptz |

Writers: `POST /api/summary/doctor`. Readers:
`GET /api/summary/doctor/:patientId` (latest), Done page.

### `medical_documents` — CORE
OCR/document saves (`POST /api/ocr/save`, archival in
`POST /api/documents/prescription/analyze`).

| column | type |
|---|---|
| id | uuid PK |
| patient_id | uuid → `patients.id` |
| session_id | uuid (kiosk interview session when known) |
| document_type | text CHECK-mapped to `prescription` / `lab_report` / `other` |
| original_file_name | text |
| mime_type | text |
| file_size | integer |
| storage_path | text (`ocr-lab/<patientId>/<sha256>.<ext>`, bucket `prescriptions`) |
| processing_status | text (`processed`, …) |
| extracted_text | text (raw OCR, always stored) |
| created_at / updated_at | timestamptz |

**No `structured_data` column exists.** The backend probes once per boot
(`supportsStructuredData()`) and omits the field when absent, so saves
never fail on the analytics column. Optional DDL:
`ALTER TABLE medical_documents ADD COLUMN structured_data JSONB;`

### `consents` — SUPPORTING
`{ id, patient_id → patients.id, consent_given bool, purpose text, … }`.
Writer: `POST /api/consents` (synced once per session from Interview page).

### `consultations` — SUPPORTING
`{ id, patient_id → patients.id, status text, … }`.
Writer: `POST /api/consultations` (created at Share time with
`shared_abha` / `shared_hospital`). Feeds the doctor queue.

### `intake` — SUPPORTING
`{ id, patient_id → patients.id (FK `intake_patient_id_fkey`), symptoms
array/jsonb, vitals jsonb, created_at }`.
Writer: `POST /api/intake`. Reader: `GET /api/intake/:patientId`.

### `documents` — LEGACY (superseded by `medical_documents`)
`{ id, patient_id (nullable, no enforced FK), document_type, file_url,
ocr_text, document_date, processed bool, created_at }`.
Anon-writable; contains at least one pre-existing `probe` row from earlier
testing (left untouched). New code does not write here except the
`processed=true` verify flag (`POST /api/documents/:id/verify`).

### `interview_questions` — SUPPORTING (lookup, minimal)
`{ id, question_key, created_at }`. No prompt/options columns were found;
the questionnaire source of truth is `frontend/src/lib/kiosk-data.ts`.
Backend does not validate against it.

### `medications`, `investigations`, `symptoms`, `interview_alerts`, `audit_logs` — UNUSED by current code
Tables exist but no endpoint reads/writes them and their columns were not
probed (RLS-blocked). No code references them. Candidates for future
structured extraction; **do not drop** without a migration plan.

## Dependency map

```
patients.id
 ├─ interview_sessions.patient_id ─┬─ interview_responses.session_id
 │                                  ├─ clinical_summaries.session_id
 │                                  └─ medical_documents.session_id
 ├─ clinical_summaries.patient_id
 ├─ medical_documents.patient_id
 ├─ consents.patient_id
 ├─ consultations.patient_id
 └─ intake.patient_id (FK intake_patient_id_fkey)
```

## RLS (as observed 2026-09-10)

- Anon/publishable key: **all reads return 0 rows; all writes → 42501**,
  on every table including `documents`/`intake` (policies were tightened
  during the audit window — earlier the same key could write those two).
- No `USING (true)` policies were created (per repair constraints).
- Backend therefore requires `SUPABASE_SERVICE_ROLE_KEY` (JWT or
  `sb_secret_` form). The server validates the shape at boot, ignores
  malformed values with a loud warning, and maps 42501 to an actionable
  error naming the missing key. The key must also be set on Render.
- The key is backend-only: never `VITE_`-prefixed, never committed
  (`backend/.env` is gitignored).

## Data-flow (fixed)

```
registration → POST /api/patients → patients.id ──┐
interview start → POST /api/interview/session ──► │ session.id
each answer → POST /api/interview/response ───────┤ (upsert session+question)
OCR Save → POST /api/ocr/save ────────────────────┤ (patient_id + session_id)
share → POST /api/consultations + /api/summary/doctor (clinical_summaries)
done → GET /api/summary/doctor/:patientId
```

## Pending (needs valid service-role key)

- Live E2E write verification + single-UUID proof query.
- Orphan scan (`patient_id` without matching `patients.id`).
- Classification of the ~34 legacy patient rows (test/duplicate/placeholder)
  — **nothing deleted**; no cleanup performed by this repair.
