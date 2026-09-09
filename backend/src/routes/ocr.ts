import { Router, type Request, type Response } from "express";
import multer from "multer";
import {
  ocrImage,
  ocrHttpResponse,
} from "../services/ocr";
import { ocrWithTesseract, SUPPORTED_IMAGE_MIME_TYPES } from "../services/tesseractOcr";
import {
  analyzeMedicalDocument,
  geminiConfigured,
  type MedicalAnalysis,
} from "../services/geminiMedical";
import { supabase } from "../database/supabase";

const MAX_OCR_BYTES = 12 * 1024 * 1024;

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",
};

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
 * Tesseract.js OCR + Gemini multimodal medical analysis pipeline.
 * The frontend NEVER talks to Gemini directly.
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
    // 2. Gemini multimodal analysis (image + OCR text)
    // ---------------------------------------------------
    let analysis: MedicalAnalysis | null = null;
    const warnings: string[] = [];

    if (geminiConfigured()) {
      try {
        analysis = await analyzeMedicalDocument(
          file.buffer,
          file.mimetype,
          ocr.rawText,
        );
      } catch (gemError: any) {
        warnings.push(
          gemError?.message ||
            "Medical analysis unavailable.",
        );
      }
    } else {
      warnings.push(
        "GEMINI_API_KEY is not configured on the server. Medical analysis unavailable.",
      );
    }

    // ---------------------------------------------------
    // 3. Persist to Supabase (never fatal — OCR + analysis
    //    are still returned even if saving fails)
    // ---------------------------------------------------
    const patientId =
      typeof req.body?.patientId === "string" && req.body.patientId.trim()
        ? req.body.patientId.trim()
        : null;

    const persistence = await persistOcrDocument({
      file,
      patientId,
      rawOcrText: ocr.rawText,
      structuredData:
        analysis ??
        ({
          summary:
            "Prescription text extracted. Medical analysis unavailable.",
          medicines: [],
          ocr: {
            provider: ocr.provider,
            confidence: ocr.confidence,
          },
        } as unknown),
    });

    if (!persistence.ok) {
      warnings.push(persistence.message);
    }

    return res.json({
      success: true,
      ocr: {
        provider: ocr.provider,
        rawText: ocr.rawText,
        confidence: ocr.confidence,
        preprocessing: ocr.preprocessing,
      },
      analysis,
      warnings,
      warning: warnings[0] || null,
      documentId: persistence.ok ? persistence.documentId : null,
      imageUrl: persistence.ok ? persistence.imageUrl : null,
    });
  });
});

interface PersistInput {
  file: Express.Multer.File;
  patientId: string | null;
  rawOcrText: string;
  structuredData: unknown;
}

async function persistOcrDocument(input: PersistInput): Promise<
  | { ok: true; documentId: string; imageUrl: string | null }
  | { ok: false; message: string }
> {
  const fileName =
    `ocr-lab/${input.patientId || "anonymous"}/` +
    `${Date.now()}${MIME_EXTENSION[input.file.mimetype] || ".jpg"}`;

  try {
    const { error: storageError } = await supabase.storage
      .from("prescriptions")
      .upload(fileName, input.file.buffer, {
        contentType: input.file.mimetype,
        upsert: false,
      });

    if (storageError) {
      return {
        ok: false,
        message: "Analysis finished, but the document could not be archived.",
      };
    }

    const { data: docRecord, error: documentError } = await supabase
      .from("medical_documents")
      .insert([
        {
          patient_id: input.patientId,
          file_path: fileName,
          raw_ocr_text: input.rawOcrText,
          structured_data: input.structuredData,
        },
      ])
      .select()
      .single();

    if (documentError || !docRecord) {
      return {
        ok: false,
        message: "Analysis finished, but the document could not be archived.",
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const imageUrl = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/prescriptions/${fileName}`
      : null;

    return { ok: true, documentId: docRecord.id, imageUrl };
  } catch {
    return {
      ok: false,
      message: "Analysis finished, but the document could not be archived.",
    };
  }
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