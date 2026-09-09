import { Router, type Request, type Response } from "express";
import multer from "multer";
import {
  ocrImage,
  ocrHttpResponse,
} from "../services/ocr";

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

      const language =
        typeof req.body?.language === "string" && req.body.language.trim()
          ? req.body.language.trim()
          : undefined;
      const ocrEngineRaw =
        typeof req.body?.ocrEngine === "string" ? Number(req.body.ocrEngine) : req.body?.ocrEngine;
      const ocrEngine =
        typeof ocrEngineRaw === "number" && Number.isInteger(ocrEngineRaw)
          ? ocrEngineRaw
          : undefined;

      if (ocrEngine !== undefined && ![1, 2, 3].includes(ocrEngine)) {
        return res.status(400).json({
          success: false,
          error: "ocrEngine must be 1, 2 or 3",
          code: "INVALID_FILE",
        });
      }

      const result = await ocrImage(file.buffer, file.mimetype, {
        language,
        ocrEngine,
        fileName: file.originalname,
      });

      return res.json(result);
    } catch (error: any) {
      const mapped = ocrHttpResponse(error);
      return res.status(mapped.status).json(mapped.body);
    }
  });
});

export default router;