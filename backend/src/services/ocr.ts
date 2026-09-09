import { ocrWithTesseract } from "./tesseractOcr";

/**
 * Single OCR service for MediKiosk.
 *
 * Tesseract.js runs entirely in-process on the Node.js backend — no external
 * OCR provider, no API key, no outbound OCR requests. The stable `ocrImage`
 * interface is kept so routes and the prescription pipeline do not change.
 */

export interface OcrOptions {
  language?: string;
  ocrEngine?: number;
  timeoutMs?: number;
  fileName?: string;
}

export interface OcrResult {
  success: true;
  text: string;
  pages: number;
  provider: "tesseract";
  source: string;
}

export function isSupportedOcrMimeType(mimeType: string): boolean {
  return (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif" ||
    mimeType === "image/bmp" ||
    mimeType === "image/x-ms-bmp" ||
    mimeType === "image/tiff" ||
    mimeType === "image/tif"
  );
}

/**
 * Extract raw text from an uploaded image using Tesseract.js.
 * Does NOT send the image anywhere outside the server.
 */
export async function ocrImage(
  fileBuffer: Buffer,
  mimeType: string,
  _options: OcrOptions = {},
): Promise<OcrResult> {
  if (!fileBuffer.length) {
    const error = new Error("The uploaded file is empty.");
    (error as Error & { code: string }).code = "INVALID_FILE";
    throw error;
  }

  const result = await ocrWithTesseract(fileBuffer, mimeType);

  return {
    success: true,
    text: result.rawText,
    pages: result.pageCount,
    provider: "tesseract",
    source: "tesseract.js",
  };
}

export function ocrHttpResponse(error: unknown): {
  status: number;
  body: { success: false; error: string; code: string };
} {
  const message =
    error instanceof Error ? error.message : "The document could not be read.";
  const code = (error as { code?: string })?.code;

  switch (code) {
    case "NO_TEXT":
      return {
        status: 422,
        body: { success: false, error: message, code: "NO_TEXT" },
      };
    case "UNSUPPORTED_TYPE":
      return {
        status: 400,
        body: { success: false, error: message, code: "UNSUPPORTED_TYPE" },
      };
    case "NO_IMAGE":
    case "INVALID_FILE":
      return {
        status: 400,
        body: { success: false, error: message, code: "INVALID_FILE" },
      };
    default:
      return {
        status: 502,
        body: {
          success: false,
          error: message,
          code: "OCR_SERVICE_UNAVAILABLE",
        },
      };
  }
}