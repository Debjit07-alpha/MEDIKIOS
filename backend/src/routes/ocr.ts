import { Router, type Request, type Response } from "express";
import multer from "multer";
import { createHash, randomUUID } from "node:crypto";
import {
  dbDocumentType,
  extensionForMime,
  isUuid,
  publicStorageUrl,
  resolvePatientId,
} from "../services/medicalDocs";
import {
  ocrImage,
  ocrHttpResponse,
} from "../services/ocr";
import { ocrWithTesseract, SUPPORTED_IMAGE_MIME_TYPES } from "../services/tesseractOcr";
import {
  aiConfigured,
  analyzeMedicalDocument,
  AiAnalysisError,
  type MedicalAnalysis,
} from "../services/aiMedical";
import { ALLOWED_DOCUMENT_TYPES } from "../services/geminiMedical";
import { supabase } from "../database/supabase";

const MAX_OCR_BYTES = 12 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_OCR_BYTES,
    files: 1,
  },
});

const router = Router();

function fileFor(req: Request): Express.Multer.File | undefined {
  return (req as Request & { file?: Express.Multer.File }).file;
}

router.post("/", (req: Request, res: Response) => {
  upload.single("file")(req, res, async (err: unknown) => {
    if (err) {
      const status = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
        ? 413
        : 400;
      return res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : "Upload failed",
        code: err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "FILE_TOO_LARGE"
          : "INVALID_FILE",
      });
    }

    try {
      const file = fileFor(req);

      if (!file || !file.buffer || !file.buffer.length) {
        return res.status(400).json({
          success: false,
          error: "No image provided",
          code: "INVALID_FILE",
        });
      }

      const result = await ocrImage(file.buffer, file.mimetype, {
        fileName: file.originalname,
      });

      return res.json(result);
    } catch (error: any) {
      const mapped = ocrHttpResponse(error);
      return res.status(mapped.status).json(mapped.body);
    }
  });
});

/**
 * POST /api/ocr/analyze
 *
 * Tesseract.js OCR + AI medical analysis pipeline.
 * The frontend NEVER talks to the AI provider directly.
 */
router.post("/analyze", (req: Request, res: Response) => {
  upload.single("file")(req, res, async (err: unknown) => {
    if (err) {
      const status =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? 413
          : 400;
      return res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : "Upload failed",
        code:
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
            ? "FILE_TOO_LARGE"
            : "INVALID_FILE",
        stage: "upload",
      });
    }

    const file = fileFor(req);
    if (!file || !file.buffer || !file.buffer.length) {
      return res.status(400).json({
        success: false,
        error: "No image provided",
        code: "INVALID_FILE",
        stage: "upload",
      });
    }

    if (!SUPPORTED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file type: ${file.mimetype}`,
        code: "INVALID_FILE",
        stage: "upload",
      });
    }

    // ---------------------------------------------------
    // 1. Tesseract.js OCR (raw text extraction)
    // ---------------------------------------------------
    let ocr;
    try {
      ocr = await ocrWithTesseract(file.buffer, file.mimetype);
    } catch (ocrError: any) {
      const friendly = ocrErrorMessage(ocrError);
      const status = ocrStatus(ocrError);
      return res.status(status).json({
        success: false,
        error: friendly,
        code: ocrError?.code || "OCR_FAILED",
        stage: "ocr",
      });
    }

    // ---------------------------------------------------
    // 2. AI medical analysis (raw OCR text only).
    //    This stage is INDEPENDENT: if it fails, Stage 1 output
    //    (raw OCR text) is still returned with success: true.
    // ---------------------------------------------------
    const stage = await runAiStage(ocr.rawText);

    // ---------------------------------------------------
    // 3. Return results WITHOUT saving. Saving happens ONLY
    //    when the patient reviews the results and presses
    //    "Save & Continue" (POST /api/ocr/save).
    // ---------------------------------------------------
    return res.json({
      success: true,
      ocr: {
        provider: ocr.provider,
        rawText: ocr.rawText,
        confidence: ocr.confidence,
        preprocessing: ocr.preprocessing,
      },
      analysis: stage.analysis,
      analysisStatus: stage.analysisStatus,
      warnings: stage.warnings,
      warning: stage.warnings[0] || null,
      documentId: null,
      imageUrl: null,
    });
  });
});

/**
 * POST /api/ocr/retry-analysis
 *
 * AI-ONLY retry. The frontend calls this when Tesseract already
 * succeeded but detailed organization was unavailable (e.g. quota 429).
 * Tesseract is NOT rerun: the caller passes back the extracted text,
 * and only the AI stage executes. Manual, single-shot — no automatic
 * retry loops anywhere in this flow.
 */
router.post("/retry-analysis", (req: Request, res: Response) => {
  upload.single("file")(req, res, async (err: unknown) => {
    if (err) {
      const status =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? 413
          : 400;
      return res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : "Upload failed",
        code:
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
            ? "FILE_TOO_LARGE"
            : "INVALID_FILE",
        stage: "upload",
      });
    }

    const file = fileFor(req);
    if (!file || !file.buffer || !file.buffer.length) {
      return res.status(400).json({
        success: false,
        error: "No image provided",
        code: "INVALID_FILE",
        stage: "upload",
      });
    }

    if (!SUPPORTED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file type: ${file.mimetype}`,
        code: "INVALID_FILE",
        stage: "upload",
      });
    }

    const ocrText =
      typeof req.body?.ocrText === "string" ? req.body.ocrText.trim() : "";
    if (!ocrText) {
      return res.status(400).json({
        success: false,
        error: "No extracted text to organize. Please upload the document again.",
        code: "NO_RAW_TEXT",
        stage: "analysis",
      });
    }

    const stage = await runAiStage(ocrText);

    return res.json({
      success: true,
      ocr: {
        provider: "tesseract",
        rawText: ocrText,
        confidence: 0,
        preprocessing: { applied: false, reason: "Reused from previous extraction" },
      },
      analysis: stage.analysis,
      analysisStatus: stage.analysisStatus,
      warnings: stage.warnings,
      warning: stage.warnings[0] || null,
      documentId: null,
      imageUrl: null,
    });
  });
});

export type AnalysisStatus = "ready" | "temporarily_unavailable" | "unavailable";

interface AiStageResult {
  analysis: MedicalAnalysis | null;
  analysisStatus: AnalysisStatus;
  warnings: string[];
}

/**
 * Stage 2 of the OCR pipeline, isolated from Stage 1 (Tesseract).
 * NEVER throws and NEVER leaks provider internals: patients receive only
 * fixed safe strings, while technical detail goes to the server log.
 */
async function runAiStage(
  rawOcrText: string,
): Promise<AiStageResult> {
  if (aiConfigured()) {
    try {
      const analysis = await analyzeMedicalDocument(rawOcrText);
      return { analysis, analysisStatus: "ready", warnings: [] };
    } catch (aiError: unknown) {
      const code =
        aiError instanceof AiAnalysisError ? aiError.code : "UNKNOWN";
      // Technical detail stays server-side. No API key, URL, model name,
      // retry delay, or billing info is ever included in the response.
      console.error("AI analysis stage failed:", code);
      if (code === "QUOTA_EXHAUSTED") {
        return {
          analysis: null,
          analysisStatus: "temporarily_unavailable",
          warnings: [
            "Detailed document organization is temporarily unavailable. The document text is still available for review.",
          ],
        };
      }
      return {
        analysis: null,
        analysisStatus: "unavailable",
        warnings: [
          "Detailed document organization is unavailable right now. The document text is still available for review.",
        ],
      };
    }
  }
  return {
    analysis: null,
    analysisStatus: "unavailable",
    warnings: [
      "Detailed document organization is unavailable right now. The document text is still available for review.",
    ],
  };
}

/**
 * POST /api/ocr/save
 *
 * Explicit "Save & Continue" persistence step. This is the ONLY place an
 * analyzed document is stored. It is called after the patient reviews the
 * analysis. It is idempotent: retrying the same saveKey never duplicates.
 * Errors are logged server-side and returned to the patient in plain language.
 */
router.post("/save", (req: Request, res: Response) => {
  upload.single("file")(req, res, async (err: unknown) => {
    if (err) {
      const tooLarge =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
      return res.status(tooLarge ? 413 : 400).json({
        success: false,
        error: tooLarge
          ? "This photo is too large. Please use a smaller image."
          : "The document could not be saved right now. Please try again.",
        code: tooLarge ? "FILE_TOO_LARGE" : "SAVE_FAILED",
      });
    }

    const file = fileFor(req);
    if (!file || !file.buffer || !file.buffer.length) {
      return res.status(400).json({
        success: false,
        error: "The document could not be saved right now. Please try again.",
        code: "SAVE_FAILED",
      });
    }

    if (!SUPPORTED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: "This photo type is not supported here. Please use a JPG, PNG, WEBP, BMP or TIFF image.",
        code: "SAVE_FAILED",
      });
    }

    const validate = validateSaveRequest(req.body);
    if (!validate.ok) {
      return res.status(400).json({
        success: false,
        error: "The document could not be saved right now. Please try again.",
        code: "SAVE_FAILED",
        reason: validate.error,
      });
    }

    try {
      const saved = await saveOcrDocument({
        file,
        patientId: validate.patientId,
        saveKey: validate.saveKey,
        sessionId: validate.sessionId,
        documentType: validate.documentType,
        rawOcrText: validate.rawOcrText,
        analysis: validate.analysis,
        analysisStatus: validate.analysisStatus,
        warnings: validate.warnings,
      });

      return res.json({
        success: true,
        documentId: saved.documentId,
        imageUrl: saved.imageUrl,
        alreadySaved: saved.alreadySaved,
        warning: saved.warning,
      });
    } catch (saveError) {
      console.error("POST /api/ocr/save error:", saveError);
      return res.status(500).json({
        success: false,
        error: "Unable to save the document. Please try again.",
        code: "SAVE_FAILED",
      });
    }
  });
});

interface ValidatedSaveRequest {
  patientId: string;
  saveKey: string;
  sessionId: string | null;
  documentType: string;
  rawOcrText: string;
  /** Null for OCR-only saves (Gemini unavailable). Nothing is invented. */
  analysis: Record<string, unknown> | null;
  analysisStatus: AnalysisStatus;
  warnings: string[];
}

const ANALYSIS_STATUSES = [
  "ready",
  "temporarily_unavailable",
  "unavailable",
] as const;

function validateSaveRequest(body: Record<string, unknown>):
  | { ok: true } & ValidatedSaveRequest
  | { ok: false; error: string } {
  const patientId =
    typeof body.patientId === "string" ? body.patientId.trim() : "";
  if (!patientId) return { ok: false, error: "NO_PATIENT_ID" };

  const saveKey = typeof body.saveKey === "string" ? body.saveKey.trim() : "";
  if (!saveKey) return { ok: false, error: "NO_SAVE_KEY" };

  // Optional link to the kiosk interview session. Only a real session UUID
  // is stored; anything else falls back to a generated value at insert time.
  const rawSessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const sessionId = isUuid(rawSessionId) ? rawSessionId : null;

  const documentType =
    typeof body.documentType === "string" ? body.documentType.trim() : "";
  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    return { ok: false, error: "BAD_DOCUMENT_TYPE" };
  }

  const rawOcrText =
    typeof body.rawOcrText === "string" ? body.rawOcrText.trim() : "";
  if (!rawOcrText) return { ok: false, error: "NO_RAW_TEXT" };

  // Structured Gemini analysis. Null (or "null"/missing) means an OCR-only
  // save: the original document + raw OCR text are still stored, and no
  // medicines, dosages, lab values, or diagnoses are fabricated.
  let analysis: Record<string, unknown> | null = null;
  if (typeof body.analysis === "string") {
    const trimmed = body.analysis.trim();
    if (trimmed !== "" && trimmed !== "null") {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          analysis = parsed as Record<string, unknown>;
        }
      } catch {
        analysis = null;
      }
    }
  }

  const rawStatus =
    typeof body.analysisStatus === "string" ? body.analysisStatus.trim() : "";
  const analysisStatus: AnalysisStatus = (
    ANALYSIS_STATUSES as readonly string[]
  ).includes(rawStatus)
    ? (rawStatus as AnalysisStatus)
    : analysis
      ? "ready"
      : "temporarily_unavailable";

  // FormData always arrives as strings: accept both the JSON-encoded form
  // the frontend sends and a plain array.
  let warningsInput: unknown = body.warnings;
  if (typeof warningsInput === "string") {
    try {
      warningsInput = JSON.parse(warningsInput);
    } catch {
      warningsInput = [];
    }
  }
  let warnings: string[] = [];
  if (Array.isArray(warningsInput)) {
    warnings = warningsInput
      .filter((entry): entry is string => typeof entry === "string")
      .slice(0, 20);
  }

  return { ok: true, patientId, saveKey, sessionId, documentType, rawOcrText, analysis, analysisStatus, warnings };
}

interface PersistInput {
  file: Express.Multer.File;
  patientId: string;
  saveKey: string;
  sessionId?: string | null;
  documentType: string;
  rawOcrText: string;
  analysis: Record<string, unknown> | null;
  analysisStatus: AnalysisStatus;
  warnings: string[];
}

export interface PersistResult {
  documentId: string;
  imageUrl: string | null;
  alreadySaved: boolean;
  warning: string | null;
}

/**
 * Shared persistence used by both the ocr-lab save flow and the standard
 * reader. Writes against the REAL medical_documents schema:
 *   patient_id (uuid, FK verified), session_id, document_type (CHECK-mapped),
 *   original_file_name, mime_type, file_size, storage_path, processing_status,
 *   extracted_text, structured_data (JSON, null for OCR-only saves).
 */
export async function persistMedicalDocument(input: {
  file: Express.Multer.File;
  patientId: string;
  documentType: string;
  rawOcrText: string;
  storagePath: string;
  sessionId?: string | null;
}): Promise<PersistResult> {
  const patientUuid = isUuid(input.patientId)
    ? input.patientId
    : await resolvePatientId(supabase, input.patientId);

  const { error: storageError } = await supabase.storage
    .from("prescriptions")
    .upload(input.storagePath, input.file.buffer, {
      contentType: input.file.mimetype,
      upsert: false,
    });

  if (storageError) {
    throw new Error(
      `Storage upload failed for "${input.storagePath}": ${storageError.message}`,
    );
  }

  const { data: docRecord, error: documentError } = await supabase
    .from("medical_documents")
    .insert([
      {
        patient_id: patientUuid,
        session_id: input.sessionId,
        document_type: dbDocumentType(input.documentType),
        original_file_name: input.file.originalname,
        mime_type: input.file.mimetype,
        file_size: input.file.size || input.file.buffer.length,
        storage_path: input.storagePath,
        processing_status: "processed",
        extracted_text: input.rawOcrText,
      },
    ])
    .select()
    .single();

  if (documentError || !docRecord) {
    throw new Error(
      documentError?.message || "Medical document record could not be created.",
    );
  }

  return {
    documentId: docRecord.id as string,
    imageUrl: publicStorageUrl(input.storagePath),
    alreadySaved: false,
    warning: null,
  };
}

export async function saveOcrDocument(input: PersistInput): Promise<PersistResult> {
  // Stable file name keyed by file content, so re-saving the same document
  // never pushes a duplicate into Supabase Storage.
  const digest = createHash("sha256").update(input.file.buffer).digest("hex");
  const fileName =
    `ocr-lab/${input.patientId}/${digest}${extensionForMime(input.file.mimetype)}`;

  // ---------------------------------------------------
  // Resolve the patient identifier to a UUID for the database foreign key.
  // The incoming patientId may be a UUID, ABHA number, Aadhaar number, etc.
  // ---------------------------------------------------
  const patientUuid = isUuid(input.patientId)
    ? input.patientId
    : await resolvePatientId(supabase, input.patientId);

  // ---------------------------------------------------
  // Idempotency: the storage_path is derived from the file content hash, so
  // saving the same photo twice returns the stored record the second time.
  // ---------------------------------------------------
  const { data: existing } = await supabase
    .from("medical_documents")
    .select("id, storage_path")
    .eq("storage_path", fileName)
    .maybeSingle();

  if (existing?.id) {
    return {
      documentId: existing.id as string,
      imageUrl: publicStorageUrl(existing.storage_path as string),
      alreadySaved: true,
      warning: null,
    };
  }

  // ---------------------------------------------------
  // Store the record: original document (Supabase Storage path) + raw OCR
  // text + structured Gemini analysis when available. For OCR-only saves
  // (Gemini unavailable) structured_data is NULL — nothing is invented,
  // and the OCR-only state stays derivable (extracted_text set,
  // structured_data null). The analysis status is logged server-side.
  // ---------------------------------------------------
  if (!input.analysis) {
    console.log(
      `POST /api/ocr/save: OCR-only save (analysisStatus=${input.analysisStatus}); ` +
        "storing document + raw OCR text with structured_data=NULL.",
    );
  }
  const docRecord = await insertMedicalDocumentRow({
    patient_id: patientUuid,
    // Prefer the real kiosk interview session so the document links to the
    // same visit; only fall back to a generated id when none was provided.
    session_id: isUuid(input.sessionId || "") ? input.sessionId : (isUuid(input.saveKey) ? input.saveKey : randomUUID()),
    document_type: dbDocumentType(input.documentType),
    original_file_name: input.file.originalname,
    mime_type: input.file.mimetype,
    file_size: input.file.size || input.file.buffer.length,
    storage_path: fileName,
    processing_status: "processed",
    extracted_text: input.rawOcrText,
    structured_data: input.analysis ? JSON.stringify(input.analysis) : null,
  });

  return {
    documentId: docRecord.id as string,
    imageUrl: publicStorageUrl(docRecord.storage_path as string),
    alreadySaved: false,
    warning: null,
  };
}

/**
 * Whether medical_documents.structured_data exists. Probed once against the
 * live schema: PostgREST reports a missing column as PGRST204 (schema cache),
 * Postgres-direct as 42703. The column is absent in production, and sending
 * it — even as null — rejects the entire insert, which was the real
 * "Save & Continue" failure.
 */
let structuredDataSupported: boolean | null = null;

async function supportsStructuredData(): Promise<boolean> {
  if (structuredDataSupported !== null) return structuredDataSupported;
  const { error } = await supabase
    .from("medical_documents")
    .select("structured_data")
    .limit(1);
  structuredDataSupported =
    !error || (error.code !== "PGRST204" && (error as { code?: string }).code !== "42703");
  if (!structuredDataSupported) {
    console.error(
      "medical_documents.structured_data column is missing; storing raw OCR text only. " +
        "Operator action: ALTER TABLE medical_documents ADD COLUMN structured_data JSONB;",
    );
  }
  return structuredDataSupported;
}

/**
 * Inserts one medical_documents row, including structured analysis data only
 * when the column actually exists. The document itself is never lost because
 * of an analytics column.
 */
async function insertMedicalDocumentRow(
  row: Record<string, unknown>,
): Promise<{ id: string; storage_path: string }> {
  const insertRow = { ...row };
  if ("structured_data" in insertRow && !(await supportsStructuredData())) {
    delete insertRow.structured_data;
  }
  const result = await supabase
    .from("medical_documents")
    .insert([insertRow])
    .select("id, storage_path")
    .single();

  if (!result.error && result.data) {
    return {
      id: result.data.id as string,
      storage_path: result.data.storage_path as string,
    };
  }

  throw new Error(
    result.error?.message || "Medical document record could not be created.",
  );
}

function ocrErrorMessage(error: any): string {
  if (error?.code === "NO_TEXT") {
    return "No readable text was found in the document. Please use a clearer photo.";
  }
  if (error?.code === "UNSUPPORTED_TYPE") {
    return "This file type is not supported. Use a JPG, PNG, WEBP or TIFF image.";
  }
  if (error?.code === "NO_IMAGE" || error?.code === "INVALID_FILE") {
    return "No image provided.";
  }
  return "The document could not be read right now. Please try again.";
}

function ocrStatus(error: any): number {
  if (error?.code === "NO_TEXT") return 422;
  if (error?.code === "UNSUPPORTED_TYPE") return 400;
  if (error?.code === "NO_IMAGE") return 400;
  return 502;
}

export default router;