const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/x-ms-bmp",
  "image/tiff",
  "image/tif",
  "application/pdf",
]);

const DEFAULT_LANGUAGE = "eng";
const DEFAULT_OCR_ENGINE = 2;
const DEFAULT_TIMEOUT_MS = 45_000;

export type OcrErrorType =
  | "API_KEY_MISSING"
  | "INVALID_API_KEY"
  | "INVALID_FILE"
  | "FILE_TOO_LARGE"
  | "NO_TEXT"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK"
  | "UPSTREAM_ERROR";

export class OcrError extends Error {
  constructor(
    public readonly type: OcrErrorType,
    message: string,
  ) {
    super(message);
    this.name = "OcrError";
  }
}

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
  provider: "ocr.space";
  source: string;
}

interface OcrSpacePage {
  FileParseExitCode?: number;
  ParsedText?: string | null;
  ErrorMessage?: string | null;
}

interface OcrSpaceResponse {
  ParsedResults?: OcrSpacePage[] | null;
  OCRExitCode?: number | string;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | null;
  ProcessingTimeInMilliseconds?: number | string;
}

function timeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

export function assertOcrApiKey(): string {
  const key = process.env.OCR_API_KEY?.trim();
  if (!key) {
    throw new OcrError(
      "API_KEY_MISSING",
      "OCR_API_KEY is not configured on the server.",
    );
  }
  return key;
}

export function isSupportedOcrMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.has(mimeType);
}

function responseToError(
  message: string | null | undefined,
  fileParseExitCode?: number,
): OcrError {
  switch (fileParseExitCode) {
    case 4:
      return new OcrError("FILE_TOO_LARGE", "The file is too large to scan.");
    case 5:
      return new OcrError(
        "INVALID_API_KEY",
        message || "The OCR service rejected the API key.",
      );
    case 2: {
      return new OcrError("INVALID_FILE", "The OCR service could not find the file.");
    }
    case 3:
    case 8:
    case 11:
      return new OcrError(
        "INVALID_FILE",
        message || "The document could not be read.",
      );
    default:
      return new OcrError(
        "UPSTREAM_ERROR",
        message || "The OCR service reported an error.",
      );
  }
}

function normalizeText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .trim();
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/bmp":
    case "image/x-ms-bmp":
      return "bmp";
    case "image/tiff":
    case "image/tif":
      return "tif";
    case "application/pdf":
      return "pdf";
    default:
      return "png";
  }
}

function fileTypeForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "JPG";
    case "image/png":
      return "PNG";
    case "image/gif":
      return "GIF";
    case "image/bmp":
    case "image/x-ms-bmp":
      return "BMP";
    case "image/tiff":
    case "image/tif":
      return "TIFF";
    case "application/pdf":
      return "PDF";
    default:
      return "PNG";
  }
}

function safeFileName(fileName: string | undefined, mimeType: string): string {
  const base = (fileName || "document")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]/g, "_")
    ?.slice(0, 80)
    || "document";
  const withoutExtension = base.replace(/\.[a-zA-Z0-9]+$/, "");
  return `${withoutExtension || "document"}.${extensionForMimeType(mimeType)}`;
}

export async function ocrImage(
  fileBuffer: Buffer,
  mimeType: string,
  options: OcrOptions = {},
): Promise<OcrResult> {
  const apiKey = assertOcrApiKey();
  const language = (options.language || DEFAULT_LANGUAGE).trim() || DEFAULT_LANGUAGE;
  const ocrEngine = options.ocrEngine || DEFAULT_OCR_ENGINE;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  if (!fileBuffer.length) {
    throw new OcrError("INVALID_FILE", "The uploaded file is empty.");
  }

  if (!isSupportedOcrMimeType(mimeType)) {
    throw new OcrError(
      "INVALID_FILE",
      `Unsupported file type: ${mimeType}`,
    );
  }

  const form = new FormData();
  form.append("apikey", apiKey);
  form.append("language", language);
  form.append("isOverlayRequired", "false");
  form.append("isTable", "false");
  form.append("detectOrientation", "true");
  form.append("scale", "true");
  form.append("OCREngine", String(ocrEngine));
  form.append("filetype", fileTypeForMimeType(mimeType));
  form.append(
    "file",
    new Blob([new Uint8Array(fileBuffer)], { type: mimeType }),
    safeFileName(options.fileName, mimeType),
  );

  let response: Response;
  try {
    response = await fetch(OCR_SPACE_ENDPOINT, {
      method: "POST",
      body: form,
      signal: timeoutSignal(timeoutMs),
    });
  } catch (error: any) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new OcrError("TIMEOUT", "The OCR service took too long to respond.");
    }
    throw new OcrError("NETWORK", "Could not reach the OCR service.");
  }

  console.info("OCR.Space request", {
    mimeType,
    bytes: fileBuffer.length,
    language,
    ocrEngine,
    status: response.status,
  });

  if (response.status === 401 || response.status === 403) {
    throw new OcrError(
      "INVALID_API_KEY",
      "The OCR service rejected the API key.",
    );
  }
  if (response.status === 429) {
    throw new OcrError("RATE_LIMITED", "The OCR service is rate-limiting requests.");
  }
  if (!response.ok) {
    throw new OcrError("UPSTREAM_ERROR", `The OCR service returned HTTP ${response.status}.`);
  }

  let payload: OcrSpaceResponse;
  try {
    payload = (await response.json()) as OcrSpaceResponse;
  } catch (error: any) {
    throw new OcrError("UPSTREAM_ERROR", "The OCR service returned an unreadable response.");
  }

  if (payload.IsErroredOnProcessing) {
    throw responseToError(payload.ErrorMessage);
  }

  if (payload.OCRExitCode === undefined) {
    throw new OcrError("UPSTREAM_ERROR", "The OCR service returned an empty response.");
  }

  const pages = Array.isArray(payload.ParsedResults)
    ? (payload.ParsedResults.filter(Boolean) as OcrSpacePage[])
    : [];

  if (!pages.length) {
    throw new OcrError("UPSTREAM_ERROR", "The OCR service returned no pages.");
  }

  const text = pages
    .map((page) => {
      if (page.FileParseExitCode !== undefined && page.FileParseExitCode !== 1) {
        throw responseToError(page.ErrorMessage, page.FileParseExitCode);
      }
      return page.ParsedText ?? "";
    })
    .join("\n\n");

  const normalized = normalizeText(text);

  if (!normalized) {
    throw new OcrError("NO_TEXT", "No readable text was found in the document.");
  }

  console.info("OCR.Space response", {
    status: response.status,
    pages: pages.length,
    textLength: normalized.length,
  });

  return {
    success: true,
    text: normalized,
    pages: pages.length,
    provider: "ocr.space",
    source: OCR_SPACE_ENDPOINT,
  };
}

export function ocrHttpResponse(error: unknown): {
  status: number;
  body: { success: false; error: string; code: string };
} {
  if (error instanceof OcrError) {
    switch (error.type) {
      case "API_KEY_MISSING":
        return {
          status: 503,
          body: { success: false, error: error.message, code: "OCR_API_KEY_MISSING" },
        };
      case "INVALID_API_KEY":
        return {
          status: 503,
          body: { success: false, error: error.message, code: "OCR_API_KEY_INVALID" },
        };
      case "INVALID_FILE":
        return {
          status: 400,
          body: { success: false, error: error.message, code: "INVALID_FILE" },
        };
      case "FILE_TOO_LARGE":
        return {
          status: 413,
          body: { success: false, error: error.message, code: "FILE_TOO_LARGE" },
        };
      case "NO_TEXT":
        return {
          status: 422,
          body: { success: false, error: error.message, code: "NO_TEXT" },
        };
      case "RATE_LIMITED":
        return {
          status: 429,
          body: { success: false, error: error.message, code: "RATE_LIMITED" },
        };
      case "TIMEOUT":
        return {
          status: 504,
          body: { success: false, error: error.message, code: "OCR_TIMEOUT" },
        };
      case "NETWORK":
      case "UPSTREAM_ERROR":
        return {
          status: 502,
          body: {
            success: false,
            error: error.message,
            code: "OCR_SERVICE_UNAVAILABLE",
          },
        };
    }
  }

  return {
    status: 500,
    body: {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected OCR error",
      code: "UNEXPECTED",
    },
  };
}