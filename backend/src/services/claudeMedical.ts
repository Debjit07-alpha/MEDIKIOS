import Anthropic from "@anthropic-ai/sdk";
import {
  ALLOWED_DOCUMENT_TYPES,
  type MedicalAnalysis,
} from "./geminiMedical";

/**
 * Claude-powered medical document analysis (Stage 2 of the OCR pipeline).
 *
 * Claude receives ONLY the raw OCR text produced by Tesseract.js (Stage 1)
 * and converts it into structured medical information using the SAME
 * MedicalAnalysis schema the rest of the pipeline already uses.
 *
 * Security: the key comes ONLY from process.env.ANTHROPIC_API_KEY and is
 * never exposed to the frontend, never logged, and never included in any
 * API response or database row.
 */

export type AiAnalysisErrorCode =
  | "API_KEY_MISSING"
  | "REQUEST_FAILED"
  | "TIMEOUT"
  | "INVALID_JSON"
  | "NO_OUTPUT"
  | "QUOTA_EXHAUSTED"
  | "AUTH_FAILED";

export class AiAnalysisError extends Error {
  constructor(
    public readonly code: AiAnalysisErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiAnalysisError";
  }
}

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_OUTPUT_TOKENS = 4096;

function configuredModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5";
}

export function claudeModelName(): string {
  return configuredModel();
}

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

const MEDICAL_SYSTEM_PROMPT = `You are a careful medical document reader for a hospital kiosk. You are given raw OCR text extracted by Tesseract.js from a medical document (prescription, blood test, urine test, sugar/glucose report, discharge paper, procedure/surgical record, etc.). The OCR text may be messy, incomplete, or contain handwriting misreads.

Your job:
- First CLASSIFY the document type into EXACTLY ONE of:
    "prescription", "blood_test_report", "urine_test_report",
    "glucose_or_sugar_report", "lab_report", "medical_report",
    "procedure_report", "surgical_document", "other_medical_document", "unknown"
  Choose "blood_test_report" for a blood panel/CBC/biochemistry result.
  Choose "urine_test_report" for a urinalysis/urine culture report.
  Choose "glucose_or_sugar_report" for a fasting/postprandial/random glucose,
  HbA1c or GTT sugar report.
  Choose "lab_report" for a laboratory report that does not fit the above
  three (e.g. biochemistry, hormone, lipid, microbiology).
  Prefer "prescription" when the document's main purpose is prescribing medicines.
- Extract ONLY information that is present in the OCR text.
- Preserve uncertainty. Never guess, never invent.

STRICT RULES (medical safety — follow every one):
- NEVER invent a medicine, dosage, frequency, route, duration or instruction that is not in the text.
- If a medicine name is only partially legible, keep the legible fragment and mark confidence "low".
- If a dosage/frequency is unclear, use null. Do NOT invent "500 mg", "1-0-1", "OD", "BD" etc.
- NEVER invent a laboratory value, unit or reference range. If the range is not in the text, use null.
- NEVER invent an abnormal flag. Set "flag" ONLY when the text marks the result as abnormal
  (for example H, L, High, Low, Abnormal, Critical). Otherwise use null.
  Do NOT decide abnormality yourself and NEVER diagnose from values:
  a glucose number stays a laboratory result, never "diabetes"; a low
  hemoglobin stays a laboratory result, never "anemia".
- Report every clearly visible investigation as its own item — there is NO fixed list of tests.
- Preserve values, units and reference ranges EXACTLY as written, including decimals and brackets.
- NEVER invent a diagnosis. Only return a diagnosis when the text explicitly states it
  (e.g. "DX: URTI", "Diagnosis: ...", "Imp: ..."). Otherwise return an empty diagnoses array.
- Never create a diagnosis from lab values, and never create one from the medicine list.
- If the document type is unclear, use "unknown".
- For patient/doctor/date fields that are not visible, use null.
- Timing details (e.g. "after food", "morning/evening") belong in "instructions", not invented fields.
- If handwriting makes a field ambiguous, keep your best faithful reading, set confidence "low",
  and explain in "warnings" that it must be verified by a doctor/pharmacist.
- Keep medicine names, test names, values and notes in the ORIGINAL language of the text.
  Do NOT translate them; do NOT guess.

Return ONLY strict JSON (no markdown fences, no commentary) with EXACTLY this shape:
{
  "documentType": "one of the ten types listed above",
  "patient": { "name": null, "age": null, "sex": null },
  "doctor": { "name": null, "registrationNumber": null },
  "date": null,
  "medicines": [
    { "name": "", "strength": null, "dosage": null, "frequency": null,
      "route": null, "duration": null, "instructions": null,
      "confidence": "high | medium | low", "evidence": "exact text from the OCR input" }
  ],
  "investigations": [
    { "test": "", "value": null, "unit": null, "referenceRange": null,
      "flag": null, "date": null,
      "confidence": "high | medium | low", "evidence": "" }
  ],
  "procedures": [
    { "name": "", "details": null, "date": null,
      "confidence": "high | medium | low", "evidence": "" }
  ],
  "diagnoses": [
    { "name": "", "status": "documented | inferred | uncertain",
      "confidence": "high | medium | low", "evidence": "" }
  ],
  "instructions": [],
  "warnings": []
}
Use null when information is not visible. Use [] when there are no items.
Use only "high", "medium" or "low" for confidence. Missing fields must be null, never invented.`;

function nullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value);
  }
  return null;
}

function text(value: unknown): string {
  return nullableString(value) ?? "";
}

function confidence(value: unknown): MedicalAnalysis["medicines"][number]["confidence"] {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "low";
}

function diagnosisStatus(value: unknown): MedicalAnalysis["diagnoses"][number]["status"] {
  return value === "documented" || value === "inferred" || value === "uncertain"
    ? value
    : "documented";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => nullableString(item))
    .filter((item): item is string => Boolean(item));
}

function medicineArray(value: unknown): MedicalAnalysis["medicines"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return {
        name: text(item.name).trim(),
        strength: nullableString(item.strength),
        dosage: nullableString(item.dosage),
        frequency: nullableString(item.frequency),
        route: nullableString(item.route),
        duration: nullableString(item.duration),
        instructions: nullableString(item.instructions),
        confidence: confidence(item.confidence),
        evidence: text(item.evidence),
      };
    })
    .filter((item) => item.name.length > 0);
}

function investigationArray(value: unknown): MedicalAnalysis["investigations"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return {
        test: text(item.test).trim(),
        value: nullableString(item.value),
        unit: nullableString(item.unit),
        referenceRange: nullableString(item.referenceRange),
        flag: nullableString(item.flag),
        date: nullableString(item.date),
        confidence: confidence(item.confidence),
        evidence: text(item.evidence),
      };
    })
    .filter((item) => item.test.length > 0);
}

function procedureArray(value: unknown): MedicalAnalysis["procedures"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return {
        name: text(item.name).trim(),
        details: nullableString(item.details),
        date: nullableString(item.date),
        confidence: confidence(item.confidence),
        evidence: text(item.evidence),
      };
    })
    .filter((item) => item.name.length > 0);
}

function diagnosisArray(value: unknown): MedicalAnalysis["diagnoses"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return {
        name: text(item.name).trim(),
        status: diagnosisStatus(item.status),
        confidence: confidence(item.confidence),
        evidence: text(item.evidence),
      };
    })
    .filter((item) => item.name.length > 0);
}

function coerced(base: Record<string, unknown>, rawOcrText: string): MedicalAnalysis {
  const patientRaw =
    base.patient && typeof base.patient === "object"
      ? (base.patient as Record<string, unknown>)
      : {};
  const doctorRaw =
    base.doctor && typeof base.doctor === "object"
      ? (base.doctor as Record<string, unknown>)
      : {};

  const documentType = (
    ALLOWED_DOCUMENT_TYPES as readonly string[]
  ).includes(base.documentType as string)
    ? (base.documentType as MedicalAnalysis["documentType"])
    : "unknown";

  return {
    documentType,
    patient: {
      name: nullableString(patientRaw.name),
      age: nullableString(patientRaw.age),
      sex: nullableString(patientRaw.sex),
    },
    doctor: {
      name: nullableString(doctorRaw.name),
      registrationNumber: nullableString(doctorRaw.registrationNumber),
    },
    date: nullableString(base.date),
    medicines: medicineArray(base.medicines),
    investigations: investigationArray(base.investigations),
    procedures: procedureArray(base.procedures),
    diagnoses: diagnosisArray(base.diagnoses),
    instructions: stringArray(base.instructions),
    rawOcrText,
    warnings: stringArray(base.warnings),
  };
}

function extractStrictJson(responseText: string): Record<string, unknown> | null {
  const cleaned = responseText
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  const tryParse = (candidate: string): Record<string, unknown> | null => {
    try {
      const parsed: unknown = JSON.parse(candidate);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(cleaned);
  if (direct) return direct;

  // Safe fallback: extract the outermost {...} block. No code is executed.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return tryParse(cleaned.slice(start, end + 1));
  }
  return null;
}

function mapProviderError(error: unknown): AiAnalysisError {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error("Claude auth failed (AUTH_FAILED): key invalid or missing permission.");
    return new AiAnalysisError(
      "AUTH_FAILED",
      "Medical analysis service is not available.",
    );
  }
  if (
    error instanceof Anthropic.RateLimitError ||
    (error instanceof Anthropic.APIError && error.status === 429)
  ) {
    console.error("Claude quota exhausted (QUOTA_EXHAUSTED): rate limit / quota reached.");
    return new AiAnalysisError(
      "QUOTA_EXHAUSTED",
      "Medical analysis quota is exhausted.",
    );
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new AiAnalysisError("TIMEOUT", "Medical analysis timed out.");
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AiAnalysisError(
      "REQUEST_FAILED",
      error.message || "Medical analysis failed",
    );
  }
  if (error instanceof Anthropic.APIError) {
    return new AiAnalysisError(
      "REQUEST_FAILED",
      `Medical analysis failed (status ${error.status}).`,
    );
  }
  return new AiAnalysisError(
    "REQUEST_FAILED",
    error instanceof Error ? error.message : "Medical analysis failed",
  );
}

/**
 * Convert raw Tesseract OCR text into structured medical information.
 * Single-shot call: no retries, no loops. Any provider failure surfaces
 * as a typed AiAnalysisError so the caller can degrade gracefully while
 * Tesseract's raw OCR text is still returned to the patient.
 */
export async function analyzeWithClaude(
  rawOcrText: string,
): Promise<MedicalAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new AiAnalysisError(
      "API_KEY_MISSING",
      "ANTHROPIC_API_KEY is not configured on the server.",
    );
  }
  const client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS });

  let response: Anthropic.Messages.Message;
  try {
    response = await client.messages.create({
      model: configuredModel(),
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0,
      system: MEDICAL_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Raw Tesseract OCR text to organize:\n\n${rawOcrText}`,
        },
      ],
    });
  } catch (error: unknown) {
    throw mapProviderError(error);
  }

  const responseText = response.content
    .filter(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text",
    )
    .map((block) => block.text)
    .join("\n");
  if (!responseText.trim()) {
    throw new AiAnalysisError("NO_OUTPUT", "Medical analysis returned an empty response.");
  }

  const parsed = extractStrictJson(responseText);
  if (!parsed) {
    throw new AiAnalysisError(
      "INVALID_JSON",
      "Medical analysis returned an unreadable response.",
    );
  }

  return coerced(parsed, rawOcrText);
}
