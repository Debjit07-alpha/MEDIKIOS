import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type GenerationConfig,
} from "@google/generative-ai";

/**
 * Gemini-powered medical document analysis.
 *
 * The pipeline ALWAYS combines BOTH the original prescription image AND the
 * Tesseract OCR text. The key comes ONLY from process.env.GEMINI_API_KEY and
 * is never exposed to the frontend. The API key is never logged.
 */

export type ConfidenceLevel = "high" | "medium" | "low";

export type MedicalDocumentType =
  | "prescription"
  | "blood_test_report"
  | "urine_test_report"
  | "glucose_or_sugar_report"
  | "lab_report"
  | "medical_report"
  | "procedure_report"
  | "surgical_document"
  | "other_medical_document"
  | "unknown";

export interface MedicineItem {
  name: string;
  strength: string | null;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  duration: string | null;
  instructions: string | null;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface InvestigationItem {
  test: string;
  value: string | null;
  unit: string | null;
  referenceRange: string | null;
  flag: string | null;
  date: string | null;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface ProcedureItem {
  name: string;
  details: string | null;
  date: string | null;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface DiagnosisItem {
  name: string;
  status: "documented" | "inferred" | "uncertain";
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface MedicalAnalysis {
  documentType: MedicalDocumentType;
  patient: { name: string | null; age: string | null; sex: string | null };
  doctor: { name: string | null; registrationNumber: string | null };
  date: string | null;
  medicines: MedicineItem[];
  investigations: InvestigationItem[];
  procedures: ProcedureItem[];
  diagnoses: DiagnosisItem[];
  instructions: string[];
  rawOcrText: string;
  warnings: string[];
}

export type GeminiErrorCode =
  | "API_KEY_MISSING"
  | "REQUEST_FAILED"
  | "TIMEOUT"
  | "INVALID_JSON"
  | "NO_OUTPUT"
  | "QUOTA_EXHAUSTED";

export class GeminiAnalysisError extends Error {
  constructor(
    public readonly code: GeminiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GeminiAnalysisError";
  }
}

/**
 * Detects Gemini quota / rate-limit exhaustion (HTTP 429,
 * RESOURCE_EXHAUSTED, per-model daily free-tier quota messages).
 * The raw provider message is NEVER forwarded to patients; callers map
 * QUOTA_EXHAUSTED to a fixed patient-safe string and log only the code.
 */
export function isQuotaExhaustedError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (record.status === 429 || record.code === 429) return true;
  }
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: unknown } | null)?.message ?? "");
  return /quota|RESOURCE_EXHAUSTED|GenerateRequestsPerDay|429/.test(message);
}

export const ALLOWED_DOCUMENT_TYPES = [
  "prescription",
  "blood_test_report",
  "urine_test_report",
  "glucose_or_sugar_report",
  "lab_report",
  "medical_report",
  "procedure_report",
  "surgical_document",
  "other_medical_document",
  "unknown",
] as const;

const ALLOWED_CONFIDENCE = ["high", "medium", "low"] as const;
const ALLOWED_DIAGNOSIS_STATUS = ["documented", "inferred", "uncertain"] as const;

const REQUEST_TIMEOUT_MS = 90_000;

// Ordered list of models to try. Newer flash models are preferred; the
// fallback chain keeps the analysis working if one model is retired.
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

function candidateModelNames(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  const models: string[] = [];
  if (configured) models.push(configured);
  for (const name of DEFAULT_MODELS) {
    if (!models.includes(name)) models.push(name);
  }
  return models;
}

export function geminiModel(): GenerativeModel | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: candidateModelNames()[0] });
}

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new GeminiAnalysisError("TIMEOUT", "Gemini analysis timed out.")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const MEDICAL_PROMPT = `You are a careful medical document reader for a hospital kiosk.
You are given TWO inputs for the SAME document:
  1. The original medical document image (prescription, blood test, urine test,
     sugar/glucose report, discharge paper, procedure/surgical record, etc.).
  2. Raw OCR text extracted by Tesseract.js from that image.

Your job:
- Inspect the ORIGINAL IMAGE carefully and compare it with the OCR text.
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
- Extract ONLY information that is visibly present in the document.
- Correct obvious OCR errors ONLY when the image clearly supports the correction.
- Preserve uncertainty. Never guess, never invent.

STRICT RULES (medical safety — follow every one):
- NEVER invent a medicine, dosage, frequency, route, duration or instruction that is not visible.
- If a medicine name is only partially legible, keep the legible fragment and mark confidence "low".
- If a dosage/frequency is unclear, use null. Do NOT invent "500 mg", "1-0-1", "OD", "BD" etc.
- NEVER invent a laboratory value, unit or reference range. If the range is not in the document, use null.
- NEVER invent an abnormal flag. Set "flag" ONLY when the document marks the result as abnormal
  (for example H, L, High, Low, Abnormal, Critical, "↑", "↓", or an asterisk used by the report).
  Put the exact marker text as shown. Otherwise use null. Do NOT decide abnormality yourself.
- Report every clearly visible investigation as its own item — there is NO fixed list of tests.
  Extract whatever the report shows (test name, value, unit, reference range, flag, date).
- Preserve the value, unit and reference range EXACTLY as printed, including decimals and brackets
  (for example "5.6", "mmol/L", "70 - 100 mg/dL").
- NEVER invent a diagnosis. Only return a diagnosis when the document explicitly states it
  (e.g. "DX: URTI", "Diagnosis: ...", "Imp: ..."). Otherwise return an empty diagnoses array.
- Never create a diagnosis from lab values, and never create one from the medicine list.
- If the document type is unclear, use "unknown".
- For patient/doctor/date fields that are not visible, use null.
- The document may be in Hindi, Tamil, Bengali or another language. Keep medicine names, test names,
  values and notes in the ORIGINAL language of the document. Do NOT translate them; do NOT guess.
- If the same information appears in both English text and handwritten notes, prefer what is clearly readable.

Return ONLY strict JSON (no markdown fences, no commentary) with EXACTLY this shape:
{
  "documentType": "one of the ten types listed above",
  "patient": { "name": null, "age": null, "sex": null },
  "doctor": { "name": null, "registrationNumber": null },
  "date": null,
  "medicines": [
    { "name": "", "strength": null, "dosage": null, "frequency": null,
      "route": null, "duration": null, "instructions": null,
      "confidence": "high | medium | low", "evidence": "exact text visible in document" }
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
Use only "high", "medium" or "low" for confidence. Missing fields must be null, never invented.

Raw Tesseract OCR text for reference:
`;

function buildMedicalPrompt(rawOcrText: string): string {
  return `${MEDICAL_PROMPT}

${rawOcrText}
`;
}

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

function string(value: unknown): string {
  return nullableString(value) ?? "";
}

function confidence(value: unknown): ConfidenceLevel {
  if (ALLOWED_CONFIDENCE.includes(value as ConfidenceLevel)) {
    return value as ConfidenceLevel;
  }
  return "low";
}

function diagnosisStatus(value: unknown): DiagnosisItem["status"] {
  if (ALLOWED_DIAGNOSIS_STATUS.includes(value as DiagnosisItem["status"])) {
    return value as DiagnosisItem["status"];
  }
  return "documented";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => nullableString(item))
    .filter((item): item is string => Boolean(item));
}

function medicineArray(value: unknown): MedicineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return {
        name: string(item.name).trim(),
        strength: nullableString(item.strength),
        dosage: nullableString(item.dosage),
        frequency: nullableString(item.frequency),
        route: nullableString(item.route),
        duration: nullableString(item.duration),
        instructions: nullableString(item.instructions),
        confidence: confidence(item.confidence),
        evidence: string(item.evidence),
      };
    })
    .filter((item) => item.name.length > 0);
}

function investigationArray(value: unknown): InvestigationItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return {
        test: string(item.test).trim(),
        value: nullableString(item.value),
        unit: nullableString(item.unit),
        referenceRange: nullableString(item.referenceRange),
        flag: nullableString(item.flag),
        date: nullableString(item.date),
        confidence: confidence(item.confidence),
        evidence: string(item.evidence),
      };
    })
    .filter((item) => item.test.length > 0);
}

function procedureArray(value: unknown): ProcedureItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return {
        name: string(item.name).trim(),
        details: nullableString(item.details),
        date: nullableString(item.date),
        confidence: confidence(item.confidence),
        evidence: string(item.evidence),
      };
    })
    .filter((item) => item.name.length > 0);
}

function diagnosisArray(value: unknown): DiagnosisItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return {
        name: string(item.name).trim(),
        status: diagnosisStatus(item.status),
        confidence: confidence(item.confidence),
        evidence: string(item.evidence),
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

  const documentType = ALLOWED_DOCUMENT_TYPES.includes(
    base.documentType as (typeof ALLOWED_DOCUMENT_TYPES)[number],
  )
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

function extractStrictJson(text: string): Record<string, unknown> | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  const tryParse = (candidate: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(candidate);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
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

export async function analyzeMedicalDocument(
  imageBuffer: Buffer,
  mimeType: string,
  rawOcrText: string,
): Promise<MedicalAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiAnalysisError(
      "API_KEY_MISSING",
      "GEMINI_API_KEY is not configured on the server.",
    );
  }
  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = buildMedicalPrompt(rawOcrText);
  const generationConfig: GenerationConfig = {
    temperature: 0,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };

  const request = (model: GenerativeModel) =>
    model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
            { text: prompt },
          ],
        },
      ],
      generationConfig,
    });

  let result: Awaited<ReturnType<GenerativeModel["generateContent"]>> | null = null;
  let lastError: unknown = null;
  let quotaExhausted: unknown = null;

  for (const modelName of candidateModelNames()) {
    try {
      result = await withTimeout(request(genAI.getGenerativeModel({ model: modelName })), REQUEST_TIMEOUT_MS);
      break;
    } catch (error: any) {
      if (error instanceof GeminiAnalysisError) throw error;
      if (error?.name === "AbortError" || error?.code === 408) {
        throw new GeminiAnalysisError("TIMEOUT", "Gemini analysis timed out.");
      }
      if (isQuotaExhaustedError(error)) {
        // Quota is tracked per model per day: fall through to the next
        // configured model exactly once each. The SAME model is never
        // retried — a 429 means stop calling it. No loops, no backoff
        // storms: at most one request per candidate model.
        quotaExhausted = error;
        lastError = error;
        continue;
      }
      const modelIssue = /is not found|not supported for/i.test(
        (error?.message as string) || "",
      );
      if (modelIssue) {
        lastError = error;
        continue;
      }
      throw new GeminiAnalysisError(
        "REQUEST_FAILED",
        error?.message || "Gemini analysis failed",
      );
    }
  }

  if (!result) {
    if (quotaExhausted) {
      // Server log keeps the technical fact; the message itself carries
      // no key, URL, or quota detail and is never shown to patients.
      console.error("Gemini quota exhausted (QUOTA_EXHAUSTED): per-model daily request quota reached.");
      throw new GeminiAnalysisError(
        "QUOTA_EXHAUSTED",
        "Gemini request quota is exhausted.",
      );
    }
    throw new GeminiAnalysisError(
      "REQUEST_FAILED",
      (lastError as Error | null)?.message || "No Gemini model could analyse the document.",
    );
  }

  const text = result?.response?.text?.() ?? "";
  if (!text.trim()) {
    throw new GeminiAnalysisError("NO_OUTPUT", "Gemini returned an empty response.");
  }

  const parsed = extractStrictJson(text);
  if (!parsed) {
    throw new GeminiAnalysisError(
      "INVALID_JSON",
      "Gemini returned an unreadable response.",
    );
  }

  return coerced(parsed, rawOcrText);
}