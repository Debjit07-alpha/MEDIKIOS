import speech from "@google-cloud/speech";
import type { protos } from "@google-cloud/speech";
import { assertGoogleCredentials } from "./googleCredentials";

export const SUPPORTED_LANGUAGE_CODES = [
  "en-IN",
  "hi-IN",
  "bn-IN",
  "mr-IN",
  "ta-IN",
  "te-IN",
  "kn-IN",
  "gu-IN",
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

function createClient() {
  return new speech.SpeechClient();
}

let client: ReturnType<typeof createClient> | undefined;

export function isSupportedLanguageCode(value: unknown): value is SupportedLanguageCode {
  return typeof value === "string" && SUPPORTED_LANGUAGE_CODES.includes(value as SupportedLanguageCode);
}

function encodingForMimeType(
  mimeType: string,
): protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding {
  if (mimeType.includes("webm")) return 9;
  if (mimeType.includes("ogg")) return 6;
  if (mimeType.includes("wav")) return 1;
  return 9;
}

export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string,
  languageCode: SupportedLanguageCode,
) {
  assertGoogleCredentials();
  client ??= createClient();

  const encoding = encodingForMimeType(mimeType);
  console.info("STT request", {
    languageCode,
    mimeType,
    bytes: buffer.length,
  });

  const [response] = await client.recognize({
    audio: { content: buffer.toString("base64") },
    config: {
      encoding,
      languageCode,
      model: "latest_long",
      enableAutomaticPunctuation: true,
    },
  });

  const results = response.results ?? [];
  const text = results
    .map((result) => result.alternatives?.[0]?.transcript ?? "")
    .filter(Boolean)
    .join(" ")
    .trim();
  const confidence = results[0]?.alternatives?.[0]?.confidence ?? 0;

  console.info("STT response", {
    languageCode,
    resultCount: results.length,
    textLength: text.length,
    confidence,
  });

  return { text, confidence };
}
