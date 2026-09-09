import { Router } from "express";
import { generateSpeech, isTtsLanguageCode } from "../services/tts";
import multer from "multer";
import { isSupportedLanguageCode, transcribeAudio } from "../services/stt";
import { GoogleProviderUnavailableError } from "../services/googleCredentials";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/speak", async (req, res) => {
  try {
    const { text, languageCode } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        success: false,
        error: "Text is required",
      });
    }

    if (!isTtsLanguageCode(languageCode)) {
      return res.status(400).json({
        success: false,
        error: "A supported languageCode is required",
      });
    }

    const audio = await generateSpeech(
      text,
      languageCode
    );

    if (!audio) {
      return res.status(500).json({
        success: false,
        error: "No audio generated",
      });
    }

    const buffer = Buffer.from(audio as Uint8Array);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Length",
      buffer.length
    );

    return res.send(buffer);
  } catch (error) {
    console.error("TTS error:", error);

    return res.status(error instanceof GoogleProviderUnavailableError ? 503 : 500).json({
      success: false,
      error: error instanceof GoogleProviderUnavailableError
        ? "Speech service is not configured"
        : "Speech generation failed",
    });
  }
});

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  const languageCode = req.body?.languageCode;
  if (!isSupportedLanguageCode(languageCode)) {
    return res.status(400).json({
      success: false,
      error: "A supported languageCode is required",
    });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, error: "Audio is required" });
  }

  try {
    const result = await transcribeAudio(req.file.buffer, req.file.mimetype, languageCode);
    return res.json({
      success: true,
      text: result.text,
      languageCode,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error("STT error", { languageCode, error });
    return res.status(error instanceof GoogleProviderUnavailableError ? 503 : 500).json({
      success: false,
      error: error instanceof GoogleProviderUnavailableError
        ? "Speech service is not configured"
        : "Transcription failed",
    });
  }
});

export default router;