import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";

/**
 * Tesseract.js OCR service for prescription images.
 *
 * The original uploaded buffer is NEVER modified. A `processedImage`
 * (orientation via EXIF, resized, grayscale, contrast, sharpen) is produced
 * only for OCR purposes and discarded afterwards.
 */

export const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/x-ms-bmp",
  "image/tiff",
  "image/tif",
]);

export type OcrErrorCode =
  | "NO_IMAGE"
  | "UNSUPPORTED_TYPE"
  | "NO_TEXT"
  | "TESSERACT_FAILED";

export class TesseractOcrError extends Error {
  constructor(
    public readonly code: OcrErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TesseractOcrError";
  }
}

export interface PreprocessInfo {
  applied: boolean;
  reason?: string;
  originalSize?: { width: number; height: number };
  processedSize?: { width: number; height: number };
  format?: string;
  /** Degrees the image was rotated before the winning OCR pass. */
  rotation?: number;
}

export interface TesseractOcrResult {
  success: true;
  rawText: string;
  confidence: number;
  provider: "tesseract";
  pageCount: number;
  preprocessing: PreprocessInfo;
}

const MAX_DIMENSION = 2400;
const OCR_TIMEOUT_MS = 120_000;

// Confidence / length floors chosen from calibration on real upright and
// rotated (90-degree-baked) prescription photos:
//   upright   -> conf ~78 @ angle 0
//   rotated   -> conf ~38 @ angle 0, conf ~79 @ correct rotation
// So we accept a pass immediately when it is clearly good, otherwise we try
// every rotation and keep the best one.
const QUICK_ACCEPT_CONFIDENCE = 60;
const ACCEPT_CONFIDENCE = 45;
const MIN_TEXT_LENGTH = 20;

let workerPromise: Promise<Worker> | null = null;
let workerInvalidated = false;

function getWorker(): Promise<Worker> {
  if (!workerPromise || workerInvalidated) {
    workerPromise = createWorker("eng").then((worker) => {
      workerInvalidated = false;
      return worker;
    });
  }
  return workerPromise;
}

function withTimeoutMs<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new TesseractOcrError("TESSERACT_FAILED", "The OCR engine took too long.")),
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

async function preprocessImage(
  buffer: Buffer,
): Promise<{ processed: Buffer; preprocessing: PreprocessInfo }> {
  try {
    const meta = await sharp(buffer).metadata();
    const originalSize = {
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    };

    const processed = await sharp(buffer)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();

    const processedMeta = await sharp(processed).metadata();
    return {
      processed,
      preprocessing: {
        applied: true,
        originalSize,
        processedSize: {
          width: processedMeta.width ?? 0,
          height: processedMeta.height ?? 0,
        },
        format: meta.format ?? undefined,
      },
    };
  } catch {
    // If preprocessing fails for any reason, OCR the original image.
    return {
      processed: buffer,
      preprocessing: { applied: false, reason: "Preprocessing unavailable" },
    };
  }
}

async function recognizeOnce(processed: Buffer): Promise<TesseractOcrResult> {
  const worker = await withTimeoutMs(getWorker(), OCR_TIMEOUT_MS);
  try {
    // The baseline pass uses the preprocessed image. If it is not clearly
    // legible, the photo may be a sideways camera shot, so every rotation is
    // tried and the best-scoring pass wins.
    const base = await recognizeBuffer(worker, processed);
    if (
      !base.text ||
      base.confidence >= QUICK_ACCEPT_CONFIDENCE &&
        base.text.length >= MIN_TEXT_LENGTH
    ) {
      if (!base.text) {
        throw new TesseractOcrError(
          "NO_TEXT",
          "No readable text was found in the document.",
        );
      }
      return buildResult(base, 0);
    }

    const candidates: { text: string; confidence: number; rotation: number }[] =
      [{ ...base, rotation: 0 }];
    for (const rotation of [90, 180, 270]) {
      const rotated = await sharp(processed).rotate(rotation).toBuffer();
      candidates.push({
        ...(await recognizeBuffer(worker, rotated)),
        rotation,
      });
    }

    const best = candidates.reduce((winner, candidate) =>
      candidate.confidence > winner.confidence ? candidate : winner,
    );

    if (
      !best.text ||
      best.confidence < ACCEPT_CONFIDENCE ||
      best.text.length < MIN_TEXT_LENGTH
    ) {
      throw new TesseractOcrError(
        "NO_TEXT",
        "No readable text was found in the document.",
      );
    }

    return buildResult(best, best.rotation);
  } catch (error) {
    if (error instanceof TesseractOcrError) throw error;
    workerInvalidated = true;
    void worker.terminate().catch(() => undefined);
    throw new TesseractOcrError(
      "TESSERACT_FAILED",
      "The OCR engine could not read the document.",
    );
  }
}

function buildResult(
  data: { text: string; confidence: number },
  rotation: number,
): TesseractOcrResult {
  return {
    success: true,
    rawText: data.text.trim(),
    confidence:
      typeof data.confidence === "number"
        ? Math.round(data.confidence * 10) / 10
        : 0,
    provider: "tesseract",
    pageCount: 1,
    preprocessing: { applied: false, rotation },
  };
}

async function recognizeBuffer(
  worker: Worker,
  buffer: Buffer,
): Promise<{ text: string; confidence: number }> {
  const { data } = await withTimeoutMs(
    worker.recognize(buffer),
    OCR_TIMEOUT_MS,
  );
  return {
    text: (data.text || "").replace(/\r\n/g, "\n").trim() as string,
    confidence: typeof data.confidence === "number" ? data.confidence : 0,
  };
}

// A single shared worker is safe to reuse, but concurrent calls on the same
// worker are not guaranteed. Serialise requests with a simple promise chain.
let recognizeQueue: Promise<unknown> = Promise.resolve();

export async function ocrWithTesseract(
  buffer: Buffer,
  mimeType: string,
): Promise<TesseractOcrResult> {
  if (!buffer.length) {
    throw new TesseractOcrError("NO_IMAGE", "The uploaded file is empty.");
  }
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new TesseractOcrError(
      "UNSUPPORTED_TYPE",
      `Unsupported file type: ${mimeType}`,
    );
  }

  const { processed, preprocessing } = await preprocessImage(buffer);

  const run = recognizeQueue.then(() => recognizeOnce(processed));
  recognizeQueue = run.then(
    () => undefined,
    () => undefined,
  );

  const result = await run;
  result.preprocessing = {
    ...preprocessing,
    rotation: result.preprocessing.rotation ?? 0,
  };
  return result;
}