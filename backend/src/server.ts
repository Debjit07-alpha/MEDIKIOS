import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import voiceRouter from "./routes/voice";
import ocrRouter, { persistMedicalDocument } from "./routes/ocr";
import { supabase, writeErrorMessage } from "./database/supabase";
import { ocrImage, ocrHttpResponse } from "./services/ocr";
import { aiConfigured, aiModelName, aiProviderName } from "./services/aiMedical";
import {
  generateDoctorEnglishSummary,
  enhanceWithAi,
  type PatientDoctorSummaryPayload,
} from "./services/doctorSummary";
import {
  findBankQuestion,
  questionsForMode,
} from "./services/interviewQuestions";

const app = express();

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
});

app.use(cors());
app.use(express.json());

app.use("/api/voice", voiceRouter);
app.use("/api/ocr", ocrRouter);

// ---------------------------------------------------------
// Canonical patient identity helpers
// ---------------------------------------------------------
// ONE KIOSK SESSION = ONE PATIENT. Every patient-specific write must
// reference the SAME patients.id UUID created at registration. Names,
// codes, phones or Aadhaar values are NEVER used as relational keys.

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

async function patientExists(patientId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .maybeSingle();
  return !error && !!data;
}

/** Find the open interview session for a patient, if any. */
async function openSessionFor(patientId: string, careMode?: string | null) {
  let query = supabase
    .from("interview_sessions")
    .select("*")
    .eq("patient_id", patientId)
    .eq("status", "active");
  if (careMode) query = query.eq("care_mode", careMode);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw dbError(error, "Reading the interview session");
  return data;
}

/**
 * interview_sessions schema (source of truth — DO NOT alter the table):
 *   care_mode text NOT NULL, only "allopathy" | "ayush"
 *   status text NOT NULL default "active", only "active" | "completed" | "cancelled"
 */
function normalizeCareMode(value: unknown): "allopathy" | "ayush" | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "ayush") return "ayush";
  if (v === "allopathy") return "allopathy";
  return null;
}

/** Preserve Supabase error codes while adding an actionable message. */
function dbError(error: any, action: string): Error {
  const err = new Error(writeErrorMessage(error, action));
  (err as any).code = error?.code;
  return err;
}

/**
 * Seed the per-session question rows.
 * interview_responses carries a composite FK
 * (session_id, question_key) → interview_questions(session_id, question_key),
 * so the question set must exist before any answer is saved.
 * Missing keys are inserted; existing rows are never touched.
 */
async function seedSessionQuestions(
  sessionId: string,
  mode: "allopathy" | "ayush",
): Promise<void> {
  const bank = questionsForMode(mode);
  const { data: existing, error: readError } = await supabase
    .from("interview_questions")
    .select("question_key")
    .eq("session_id", sessionId);
  if (readError) throw dbError(readError, "Reading the session questions");
  const known = new Set((existing || []).map((r: any) => r.question_key));
  const missing = bank.filter((q) => !known.has(q.key));
  if (missing.length === 0) return;
  const { error: insertError } = await supabase
    .from("interview_questions")
    .insert(
      missing.map((q) => ({
        session_id: sessionId,
        question_key: q.key,
        question_text: q.text,
        question_order: q.order,
      }))
    );
  if (insertError) throw dbError(insertError, "Seeding the session questions");
}

/**
 * Guarantee a single question row exists for this session (e.g. a newer
 * kiosk build asks a key the session was not seeded with, or a free-form
 * voice answer arrives under a fresh key). Never duplicates.
 */
async function ensureSessionQuestion(
  sessionId: string,
  mode: "allopathy" | "ayush",
  questionKey: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("interview_questions")
    .select("id")
    .eq("session_id", sessionId)
    .eq("question_key", questionKey)
    .maybeSingle();
  if (error) throw dbError(error, "Reading the session question");
  if (data?.id) return;
  const bankEntry = findBankQuestion(mode, questionKey);
  const { error: insertError } = await supabase
    .from("interview_questions")
    .insert([
      {
        session_id: sessionId,
        question_key: questionKey,
        question_text: bankEntry ? bankEntry.text : questionKey,
        question_order: bankEntry ? bankEntry.order : 999,
      },
    ]);
  if (insertError) throw dbError(insertError, "Adding the session question");
}

/** Care mode stored on a session row ("allopathy" | "ayush"). */
function sessionMode(session: any): "allopathy" | "ayush" {
  return session?.care_mode === "ayush" ? "ayush" : "allopathy";
}

// ---------------------------------------------------------
// External Clients
// ---------------------------------------------------------

// OpenAI is OPTIONAL.
// The server can start even when OPENAI_API_KEY is not configured.
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  : null;

// ---------------------------------------------------------
// 1. HEALTH CHECK
// ---------------------------------------------------------

app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "MediKiosk API is running 🚀",
  });
});

// ---------------------------------------------------------
// Patient Login ID + Password helpers.
// The Login ID is the existing patients.patient_code (display UHID).
// Passwords are hashed server-side with scrypt; plaintext is never stored
// and the hash is never returned by any endpoint.
// ---------------------------------------------------------

// Helper to generate a unique Login ID / Patient Code (e.g. MED-1024).
function generatePatientCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MED-${num}`;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return ["scrypt", salt, derived].join("$");
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt" || !parts[1] || !parts[2]) return false;
    const derived = scryptSync(password, parts[1], 64);
    const expected = Buffer.from(parts[2], "hex");
    if (derived.length !== expected.length || expected.length === 0) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// 2. REGISTER NEW PATIENT
// ---------------------------------------------------------

app.post("/api/patients", async (req: Request, res: Response) => {
  try {
    const {
      name,
      age,
      gender,
      phone,
      abha_number,
      aadhaar_id,
      date_of_birth,
      preferred_language,
      full_name,
      phone_number,
      patient_code,
      patientCode,
      password,
    } = req.body;

    const patientData: Record<string, unknown> = {
      name: name || full_name || "New Patient",
      patient_code: patient_code || patientCode || generatePatientCode(),
      full_name: full_name || name || null,
      age: age ?? 0,
      gender: gender || "Not stated",
      phone: phone || phone_number || null,
      phone_number: phone_number || phone || null,
      abha_number: abha_number || null,
      aadhaar_id: aadhaar_id || null,
      date_of_birth: date_of_birth || null,
      preferred_language: preferred_language || null,
    };

    // Optional account password (4+ chars, PIN-friendly). Hashed server-side;
    // only included when supplied. Requires the password_hash column
    // (see pending migration) — otherwise a clear staff message is returned.
    if (typeof password === "string" && password.length > 0) {
      if (password.length < 4) {
        return res.status(400).json({
          success: false,
          error: "Please choose a password or PIN with at least 4 characters.",
        });
      }
      patientData.password_hash = hashPassword(password);
    }

    // The random Login ID can theoretically collide: regenerate and retry
    // only when the database reports a uniqueness violation.
    let data: any = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: created, error: insertError } = await supabase
        .from("patients")
        .insert([patientData])
        .select()
        .single();
      if (!insertError) {
        data = created;
        break;
      }
      const msg = (insertError.message || "").toLowerCase();
      if (msg.includes("password_hash")) {
        return res.status(400).json({
          success: false,
          error: "Patient account setup needs a database update. Please ask staff for help.",
        });
      }
      const isCollision =
        msg.includes("duplicate") || msg.includes("unique") || (insertError as any).code === "23505";
      if (isCollision && attempt < 3 && !patient_code && !patientCode) {
        patientData.patient_code = generatePatientCode();
        continue;
      }
      console.error("Patient creation error:", insertError);
      return res.status(400).json({
        success: false,
        error: insertError.message,
      });
    }

    // Never leak the password hash to the client.
    if (data && typeof data === "object") delete (data as any).password_hash;
    return res.status(201).json(data);
  } catch (error: any) {
    console.error("POST /api/patients error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create patient",
    });
  }
});

// ---------------------------------------------------------
// 2B. PATIENT LOGIN (Login ID + Password).
// Simple identification for the kiosk demo — NOT Aadhaar/ABHA auth.
// Verifies the scrypt password_hash server-side. Generic 404 responses
// so valid Login IDs cannot be enumerated. Creates nothing, lists nothing.
// ---------------------------------------------------------

app.post("/api/patients/login", async (req: Request, res: Response) => {
  try {
    const { loginId, patientCode, password } = req.body || {};

    const id = typeof loginId === "string" ? loginId.trim() : typeof patientCode === "string" ? patientCode.trim() : "";
    if (!id || typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        error: "Please enter your Login ID and password.",
      });
    }

    const INVALID = "Invalid Login ID or password.";
    // Pre-migration (no password_hash column yet) no account can verify,
    // so every attempt is an invalid login — never a 500.
    let candidates: any[] = [];
    try {
      const found = await supabase
        .from("patients")
        .select("id, patient_code, name, full_name, age, gender, phone, phone_number, preferred_language, password_hash")
        .ilike("patient_code", id);
      if (found.error) throw found.error;
      candidates = found.data || [];
    } catch (lookupError: any) {
      const m = String(lookupError?.message || "").toLowerCase();
      if (m.includes("password_hash")) {
        return res.status(404).json({ success: false, error: INVALID });
      }
      throw lookupError;
    }
    const matched = (candidates || [])[0];
    if (!matched || typeof matched.password_hash !== "string" || !verifyPassword(password, matched.password_hash)) {
      return res.status(404).json({ success: false, error: INVALID });
    }

    return res.json({
      success: true,
      patient: {
        id: matched.id,
        patientCode: matched.patient_code || matched.id,
        name: matched.name || matched.full_name || "Patient",
        phoneNumber: matched.phone || matched.phone_number || null,
        preferredLanguage: matched.preferred_language || "en",
        age: matched.age ?? null,
        gender: matched.gender || null,
      },
    });
  } catch (error: any) {
    console.error("POST /api/patients/login error:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: "Unable to verify your details right now. Please try again or ask staff for help.",
    });
  }
});

// 3. IDENTIFY PATIENT
// ---------------------------------------------------------

app.post("/api/patients/identify", async (req: Request, res: Response) => {
  try {
    const { method, value } = req.body;

    if (!method || !value) {
      return res.status(400).json({
        success: false,
        error: "Identification method and value are required",
      });
    }

    let query = supabase.from("patients").select("*");

    if (method === "abha") {
      query = query.eq("abha_number", value);
    } else if (method === "aadhaar") {
      query = query.eq("aadhaar_id", value);
    } else {
      query = query.eq("id", value);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Patient identification error:", error);

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Patient not found",
      });
    }

    return res.json(data);
  } catch (error: any) {
    console.error("POST /api/patients/identify error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to identify patient",
    });
  }
});

// ---------------------------------------------------------
// 3b. GET SINGLE PATIENT (canonical record for a kiosk session)
// ---------------------------------------------------------

app.get("/api/patients/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        error: "A valid patient UUID is required",
      });
    }

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch patient",
    });
  }
});

// ---------------------------------------------------------
// 3c. UPDATE PATIENT (Phase 5: UPDATE the SAME patients.id,
// never INSERT a second row when details arrive later)
// ---------------------------------------------------------

const PATIENT_UPDATABLE_FIELDS = [
  "name",
  "full_name",
  "age",
  "gender",
  "phone",
  "phone_number",
  "abha_number",
  "aadhaar_id",
  "date_of_birth",
  "preferred_language",
] as const;

app.patch("/api/patients/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        error: "A valid patient UUID is required",
      });
    }

    const patch: Record<string, unknown> = {};
    for (const field of PATIENT_UPDATABLE_FIELDS) {
      if (req.body?.[field] !== undefined) patch[field] = req.body[field];
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No updatable patient fields provided",
      });
    }

    const { data, error } = await supabase
      .from("patients")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Patient update error:", error);
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update patient",
    });
  }
});

// ---------------------------------------------------------
// 3d. SAVE CONSENT (linked to the canonical patients.id)
// ---------------------------------------------------------

app.post("/api/consents", async (req: Request, res: Response) => {
  try {
    const { patientId, patient_id, purpose, consentGiven } = req.body || {};
    const pid = patientId || patient_id;

    if (!isUuid(pid)) {
      return res.status(400).json({
        success: false,
        error: "A valid patient UUID is required",
      });
    }

    if (!(await patientExists(pid))) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    const { data, error } = await supabase
      .from("consents")
      .insert([
        {
          patient_id: pid,
          purpose: purpose || "kiosk_care",
          consent_given: consentGiven !== false,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save consent",
    });
  }
});

// ---------------------------------------------------------
// 3e. CREATE CONSULTATION (linked to the canonical patients.id)
// ---------------------------------------------------------

app.post("/api/consultations", async (req: Request, res: Response) => {
  try {
    const { patientId, patient_id, status } = req.body || {};
    const pid = patientId || patient_id;

    if (!isUuid(pid)) {
      return res.status(400).json({
        success: false,
        error: "A valid patient UUID is required",
      });
    }

    if (!(await patientExists(pid))) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    const { data, error } = await supabase
      .from("consultations")
      .insert([{ patient_id: pid, status: status || "waiting" }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create consultation",
    });
  }
});

// ---------------------------------------------------------
// 4. SAVE INTAKE
// ---------------------------------------------------------

app.post("/api/intake", async (req: Request, res: Response) => {
  try {
    const {
      patient_id,
      symptoms,
      vitals,
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        error: "patient_id is required",
      });
    }

    const { data, error } = await supabase
      .from("intake")
      .insert([
        {
          patient_id,
          symptoms: symptoms || [],
          vitals: vitals || {},
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Intake save error:", error);

      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(201).json(data);
  } catch (error: any) {
    console.error("POST /api/intake error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save intake",
    });
  }
});

// ---------------------------------------------------------
// 4b. INTERVIEW SESSION (ONE active session per patient + care mode).
// Created once when Questions starts; reused on every render, question
// change and answer. Status "active" matches the DB check constraint.
// ---------------------------------------------------------

app.post("/api/interview/session", async (req: Request, res: Response) => {
  try {
    const { patientId, patient_id, careMode, care_mode } = req.body || {};
    const pid = patientId || patient_id;
    const mode = normalizeCareMode(careMode || care_mode);

    if (!isUuid(pid)) {
      return res.status(400).json({
        success: false,
        error: "A valid patient UUID is required",
      });
    }

    if (!mode) {
      return res.status(400).json({
        success: false,
        error: 'careMode is required ("allopathy" or "ayush")',
      });
    }

    if (!(await patientExists(pid))) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    const existing = await openSessionFor(pid, mode);
    if (existing) {
      await seedSessionQuestions(existing.id, mode);
      return res.json({ success: true, data: existing, reused: true });
    }

    const { data, error } = await supabase
      .from("interview_sessions")
      .insert([{ patient_id: pid, status: "active", care_mode: mode }])
      .select()
      .single();

    if (error) {
      console.error("Interview session creation error:", error);
      return res.status(400).json({ success: false, error: error.message });
    }

    try {
      await seedSessionQuestions(data.id, mode);
    } catch (seedError: any) {
      console.error("Interview question seeding error:", seedError?.message || seedError);
      return res.status(500).json({
        success: false,
        error: seedError?.message || "Failed to prepare the interview questions",
      });
    }

    return res.status(201).json({ success: true, data, reused: false });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create interview session",
    });
  }
});

app.post("/api/interview/session/:id/complete", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ success: false, error: "A valid session UUID is required" });
    }

    const { data, error } = await supabase
      .from("interview_sessions")
      .update({ status: "completed" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to complete interview session",
    });
  }
});

// ---------------------------------------------------------
// 4c. SAVE INTERVIEW RESPONSE (real schema:
// interview_responses { session_id, question_key, answer }).
// One current row per session + question: re-answering UPDATES.
// ---------------------------------------------------------

app.post("/api/interview/response", async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      patient_id,
      sessionId,
      session_id,
      questionId,
      question_id,
      questionKey,
      responseText,
      answer,
      responseType,
    } = req.body || {};

    const pid = patientId || patient_id;
    const qkey = questionId || question_id || questionKey;
    // Frontend sends option taps as a JSON array string and free-form
    // voice as the raw transcript. Stored verbatim in answer (text):
    // NO double-stringify, NO undefined values.
    const answerText = responseText ?? answer;
    const rtype = responseType || "option";

    if (!isUuid(pid)) {
      return res.status(400).json({
        success: false,
        error: "A valid patient UUID is required",
      });
    }

    if (!qkey || typeof qkey !== "string") {
      return res.status(400).json({
        success: false,
        error: "questionId is required",
      });
    }

    if (typeof answerText !== "string" || !answerText.trim()) {
      return res.status(400).json({
        success: false,
        error: "responseText is required",
      });
    }

    // Resolve the session: explicit sessionId wins (must belong to the
    // patient), otherwise reuse the patient's active session.
    // NEVER create an incomplete session (care_mode is NOT NULL) and NEVER
    // one session per question or per route transition.
    let session: any = null;
    const sid = sessionId || session_id;
    if (isUuid(sid)) {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("id", sid)
        .maybeSingle();
      if (error) throw dbError(error, "Reading the interview session");
      if (!data || data.patient_id !== pid) {
        return res.status(400).json({
          success: false,
          error: "Interview session does not belong to this patient",
        });
      }
      session = data;
    } else {
      session = await openSessionFor(pid);
      if (!session) {
        // Only auto-create when the caller supplies a valid care mode
        // (e.g. an answer tapped before the session-ensure round-trip
        // finished). Otherwise refuse instead of inserting an invalid row.
        const fallbackMode = normalizeCareMode(
          (req.body || {}).careMode || (req.body || {}).care_mode
        );
        if (!fallbackMode) {
          return res.status(400).json({
            success: false,
            error: "No active interview session. Start the interview first.",
          });
        }
        const { data, error } = await supabase
          .from("interview_sessions")
          .insert([{ patient_id: pid, status: "active", care_mode: fallbackMode }])
          .select()
          .single();
        if (error) throw dbError(error, "Creating the interview session");
        session = data;
        await seedSessionQuestions(session.id, fallbackMode);
      }
    }

    // Voice transcripts are stored verbatim; option taps keep the values
    // the frontend sent. The schema has no response_type column, so the
    // frontend-provided text is authoritative in both cases.
    const storedAnswer = answerText;

    // The (session_id, question_key) FK requires the question row:
    // backfill it when the session predates seeding or the key is new.
    await ensureSessionQuestion(session.id, sessionMode(session), qkey);

    const { data: existing } = await supabase
      .from("interview_responses")
      .select("id")
      .eq("session_id", session.id)
      .eq("question_key", qkey)
      .maybeSingle();

    let saved: any;
    if (existing?.id) {
      const { data, error } = await supabase
        .from("interview_responses")
        .update({ answer: storedAnswer })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw dbError(error, "Updating the interview response");
      saved = data;
    } else {
      const { data, error } = await supabase
        .from("interview_responses")
        .insert([{ session_id: session.id, question_key: qkey, answer: storedAnswer }])
        .select()
        .single();
      if (error) throw dbError(error, "Saving the interview response");
      saved = data;
    }

    return res.status(201).json({ success: true, data: saved, sessionId: session.id });
  } catch (error: any) {
    console.error("POST /api/interview/response error:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save interview response",
    });
  }
});

// ---------------------------------------------------------
// 4d. LIST INTERVIEW RESPONSES FOR A SESSION (verification)
// ---------------------------------------------------------

app.get("/api/interview/session/:id/responses", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ success: false, error: "A valid session UUID is required" });
    }

    const { data, error } = await supabase
      .from("interview_responses")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to list interview responses",
    });
  }
});

// ---------------------------------------------------------
// 4e. GENERATE + STORE DOCTOR SUMMARY (always English).
// Persisted in clinical_summaries { patient_id, session_id, summary
// (jsonb) } — the table that actually exists for this purpose.
// ---------------------------------------------------------

app.post("/api/summary/doctor", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    const patientId = body.patientId || body.patient_id;
    if (!isUuid(patientId)) {
      return res.status(400).json({
        success: false,
        error: "A valid patient UUID is required",
      });
    }

    const payload: PatientDoctorSummaryPayload = {
      patientId,
      patientLanguage: body.patientLanguage || "en",
      careMode: body.careMode === "ayush" ? "ayush" : "allopathy",
      patient: body.patient || null,
      answers: body.answers || {},
      voiceAnswers: body.voiceAnswers || {},
      documents: Array.isArray(body.documents) ? body.documents : [],
      redFlag: body.redFlag || null,
      doctorSummaryRows: Array.isArray(body.doctorSummaryRows) ? body.doctorSummaryRows : [],
      shareScope: body.shareScope === "abha" ? "abha" : "hospital",
    };

    // The doctor summary language is enforced here, server-side, and is never
    // derived from the patient's selected language.
    const englishSummary = generateDoctorEnglishSummary(payload);
    // AI enhancement is best-effort: a bad/missing key must NEVER prevent
    // the deterministic summary from being stored and returned.
    let finalSummary = englishSummary;
    if (openai) {
      try {
        finalSummary = await enhanceWithAi(payload, openai as any);
      } catch (aiError: any) {
        console.warn("AI summary enhancement failed, using deterministic summary:", aiError?.message || aiError);
      }
    }

    const doctorSummary = {
      language: "en" as const,
      content: finalSummary,
    };

    const patientSummary = {
      language: payload.patientLanguage,
      content: Array.isArray(body.patientSummaryRows) ? body.patientSummaryRows : [],
    };

    // Persist ONE clinical_summaries row for this patient/session.
    // clinical_summaries.summary is jsonb: pass the OBJECT, never a
    // pre-stringified string (the client must not double-stringify).
    const summaryPayload = {
      patientLanguage: payload.patientLanguage,
      careMode: payload.careMode,
      shareScope: payload.shareScope,
      patientSummary,
      doctorSummary,
      generatedAt: new Date().toISOString(),
    };

    let sessionId: string | null = null;
    try {
      const open = await openSessionFor(patientId);
      sessionId = (open?.id as string) || null;
    } catch {
      sessionId = null;
    }

    const { data: summaryRow, error: summaryError } = await supabase
      .from("clinical_summaries")
      .insert([
        {
          patient_id: patientId,
          session_id: sessionId,
          summary: summaryPayload,
        },
      ])
      .select()
      .single();

    if (summaryError) {
      console.error("Doctor summary storage error:", summaryError.message);
      return res.status(500).json({
        success: false,
        error: summaryError.message || "Failed to store summary",
        doctorSummary,
      });
    }

    return res.status(201).json({
      success: true,
      patientId,
      summaryId: summaryRow.id,
      patientLanguage: payload.patientLanguage,
      patientSummary,
      doctorSummary,
    });
  } catch (error: any) {
    console.error("POST /api/summary/doctor error:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to generate doctor summary",
    });
  }
});

// Retrieve the latest stored doctor (English) + patient (localised) summaries.
app.get("/api/summary/doctor/:patientId", async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    if (!isUuid(patientId)) {
      return res.status(400).json({ success: false, error: "A valid patient UUID is required" });
    }

    const { data, error } = await supabase
      .from("clinical_summaries")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Doctor summary fetch error:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!data?.summary) {
      return res.status(404).json({
        success: false,
        error: "No shared summary found for this patient",
      });
    }

    const stored = data.summary as {
      patientLanguage?: string;
      patientSummary?: { language: string; content: unknown[] };
      doctorSummary?: { language: string; content: unknown };
    };

    return res.json({
      success: true,
      patientId,
      summaryId: data.id,
      patientLanguage: stored.patientLanguage || "en",
      patientSummary: stored.patientSummary || { language: "en", content: [] },
      doctorSummary: stored.doctorSummary || { language: "en", content: null },
    });
  } catch (error: any) {
    console.error("GET /api/summary/doctor/:patientId error:", error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to fetch summary" });
  }
});

// ---------------------------------------------------------
// 5. PRESCRIPTION OCR + OPTIONAL AI ANALYSIS
// ---------------------------------------------------------

app.post(
  "/api/documents/prescription/analyze",
  upload.single("file"),
  async (req: any, res: Response) => {
    try {
      const file = req.file;
      const { patientId, ocrText } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No image provided",
          code: "INVALID_FILE",
        });
      }

      let fullText = "";
      let structuredData: any = null;

      // ---------------------------------------------------
      // A. Text extraction (Tesseract.js)
      // ---------------------------------------------------

      // When the kiosk has already extracted and reviewed the text,
      // the corrected version is passed back so it is NOT re-OCRed.
      const reviewedText =
        typeof ocrText === "string" ? ocrText.trim() : "";

      if (reviewedText) {
        fullText = reviewedText;
      } else {
        try {
          const ocrResult = await ocrImage(
            file.buffer,
            file.mimetype,
            { fileName: file.originalname },
          );

          fullText = ocrResult.text;
          console.log("OCR completed successfully.");
        } catch (ocrError) {
          const mapped = ocrHttpResponse(ocrError);
          return res.status(mapped.status).json(mapped.body);
        }
      }

      // ---------------------------------------------------
      // B. Optional OpenAI Analysis
      // ---------------------------------------------------

      if (openai) {
        try {
          const aiResponse =
            await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a medical pharmacist. Extract medicines from OCR text into JSON. Return exactly this structure: { medicines: [{ writtenName, genericName, strength, dosage, frequency, purpose, confidence, needsVerification }], summary: '' }. Do not invent information that is not present in the prescription.",
                },
                {
                  role: "user",
                  content: `Analyze this prescription text:\n\n${fullText}`,
                },
              ],
              response_format: {
                type: "json_object",
              },
            });

          structuredData = JSON.parse(
            aiResponse.choices[0].message.content || "{}"
          );

          console.log("OpenAI prescription analysis completed.");
        } catch (aiError: any) {
          console.warn(
            "OpenAI analysis failed:",
            aiError?.message || aiError
          );
        }
      } else {
        console.warn(
          "OpenAI API key not configured."
        );
      }

      // ---------------------------------------------------
      // C. Structured data fallback if AI unavailable
      // ---------------------------------------------------

      if (!structuredData) {
        structuredData = {
          summary:
            "Prescription text extracted. AI analysis unavailable.",
          medicines: [],
        };
      }

      // ---------------------------------------------------
      // D. Archival (best-effort). OCR + analysis are finished, so archiving
      //    must NEVER block returning the detected contents to the patient.
      //    Storage uploads can fail (e.g. storage RLS) and the real
      //    medical_documents schema differs from the assumed one, so any
      //    failure is logged and the analysis is still returned.
      // ---------------------------------------------------

      let documentId: string | null = null;
      let imageUrl: string | null = null;

      try {
        const digest = createHash("sha256").update(file.buffer).digest("hex");
        const archivalName = `documents/${patientId || "anonymous"}/${Date.now()}-${digest}.jpg`;

        const persisted = await persistMedicalDocument({
          file,
          patientId: patientId || "",
          documentType: "prescription",
          rawOcrText: fullText,
          storagePath: archivalName,
        });

        documentId = persisted.documentId;
        imageUrl = persisted.imageUrl;
      } catch (archiveError) {
        console.error(
          "Prescription archival skipped (analysis is still returned):",
          archiveError,
        );
      }

      // ---------------------------------------------------
      // E. Return result — always, even when archival failed.
      // ---------------------------------------------------

      return res.json({
        success: true,
        documentId,
        imageUrl,
        analysis: structuredData,
        rawOcrText: fullText,
        warning:
          documentId === null
            ? "The document was read, but it could not be stored in the health record right now."
            : null,
      });
    } catch (error: any) {
      console.error(
        "Critical prescription processing error:",
        error
      );

      return res.status(500).json({
        success: false,
        error: "The document could not be processed right now. Please try again.",
      });
    }
  }
);

// ---------------------------------------------------------
// 6. READ ENDPOINTS CONSUMED BY THE KIOSK + STAFF SCREENS
// ---------------------------------------------------------

app.get("/api/intake/:patientId", async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    if (!isUuid(patientId)) {
      return res.status(400).json({ success: false, error: "A valid patient UUID is required" });
    }
    const { data, error } = await supabase
      .from("intake")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!data) return res.status(404).json({ success: false, error: "No intake found" });
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch intake" });
  }
});

// Health timeline: newest medical documents + legacy documents first.
app.get("/api/timeline/:patientId", async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    if (!isUuid(patientId)) {
      return res.status(400).json({ success: false, error: "A valid patient UUID is required" });
    }
    const [docs, legacy] = await Promise.all([
      supabase.from("medical_documents").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
    ]);
    if (docs.error) return res.status(500).json({ success: false, error: docs.error.message });
    const items = [
      ...((docs.data || []).map((d: any) => ({
        id: d.id,
        date: (d.created_at || "").slice(0, 10),
        event: d.document_type || "document",
        description: d.original_file_name || d.document_type || "Medical document",
      }))),
      ...(((legacy.error ? [] : legacy.data) || []).map((d: any) => ({
        id: d.id,
        date: d.document_date || (d.created_at || "").slice(0, 10),
        event: d.document_type || "document",
        description: (d.ocr_text || "").slice(0, 140) || "Medical document",
      }))),
    ];
    return res.json(items);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch timeline" });
  }
});

// Staff queue: latest registered patients.
app.get("/api/staff/patients", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("id, patient_code, name, age, gender, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json(data || []);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to list patients" });
  }
});

app.get("/api/staff/patients/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, error: "A valid patient UUID is required" });
    }
    const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!data) return res.status(404).json({ success: false, error: "Patient not found" });
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch patient" });
  }
});

// Documents for a patient (new medical_documents table, mapped to the
// DocumentRecord shape the kiosk screens consume).
app.get("/api/documents/:patientId", async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    if (!isUuid(patientId)) {
      return res.status(400).json({ success: false, error: "A valid patient UUID is required" });
    }
    const { data, error } = await supabase
      .from("medical_documents")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json(
      (data || []).map((d: any) => ({
        id: d.id,
        patient_id: d.patient_id,
        file_path: d.storage_path,
        original_file_path: d.storage_path,
        raw_ocr_text: d.extracted_text || "",
        structured_data: null,
        preprocessing_info: {},
        status: d.processing_status || "processed",
        created_at: d.created_at,
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to list documents" });
  }
});

// Legacy documents verification flag.
app.post("/api/documents/:id/verify", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, error: "A valid document UUID is required" });
    }
    const { data, error } = await supabase
      .from("documents")
      .update({ processed: true })
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to verify document" });
  }
});

// ---------------------------------------------------------
// SERVER
// ---------------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Backend running on http://localhost:${PORT}`
  );

  console.log(
    `OpenAI: ${openai ? "configured" : "not configured"
    }`
  );

  console.log(
    `Medical AI: ${aiConfigured() ? `configured (${aiProviderName()}, model ${aiModelName()})` : "not configured (set ANTHROPIC_API_KEY)"}`
  );

  console.log(
    "OCR: Tesseract.js (in-process, no API key required)"
  );
});