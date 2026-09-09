import textToSpeech from "@google-cloud/text-to-speech";
import { assertGoogleCredentials, GoogleProviderUnavailableError } from "./googleCredentials";

function createClient() {
  return new textToSpeech.TextToSpeechClient();
}

let client: ReturnType<typeof createClient> | undefined;

const VOICES: Record<string, string> = {
  "en-IN": "en-IN-Neural2-A",
  "hi-IN": "hi-IN-Wavenet-A",
  "bn-IN": "bn-IN-Wavenet-A",
  "mr-IN": "mr-IN-Wavenet-A",
  "ta-IN": "ta-IN-Wavenet-A",
  "te-IN": "te-IN-Wavenet-A",
  "kn-IN": "kn-IN-Wavenet-A",
  "gu-IN": "gu-IN-Wavenet-A",
};

const GOOGLE_CLOUD_TTS_LANGUAGES = new Set(Object.keys(VOICES));

/**
 * Google Translate's free TTS endpoint (no API key required). Used as a
 * last-resort fallback so every supported Indian language still produces
 * audio even when Google Cloud credentials are not configured. Returns MP3.
 */
const translateCache = new Map<string, Uint8Array>();

async function generateTranslateSpeech(text: string, languageCode: string) {
  const lang = translateTtsLang(languageCode);
  const speechText = trimToSentence(text, 180);
  const cacheKey = `${languageCode}::${speechText}`;

  const cached = translateCache.get(cacheKey);
  if (cached) {
    console.info("Translate TTS cache hit", { languageCode, lang, textLength: speechText.length });
    return cached;
  }

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(
    speechText,
  )}`;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) {
      await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
    try {
      console.info("Translate TTS request", {
        languageCode,
        lang,
        textLength: speechText.length,
        attempt,
      });
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!response.ok) {
        const err = new Error(`Translate TTS returned ${response.status}`);
        lastError = err;
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0) {
        lastError = new Error("Translate TTS returned an empty audio buffer");
        continue;
      }
      const result = new Uint8Array(buffer);
      // Store up to 500 unique prompts to avoid redundant calls.
      if (translateCache.size > 500) {
        const firstKey = translateCache.keys().next().value;
        if (firstKey) translateCache.delete(firstKey);
      }
      translateCache.set(cacheKey, result);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("Translate TTS failed after all retries");
}

function trimToSentence(text: string, maxLength: number): string {
  const trimmed = text.trim();
  const stripMarkup = trimmed.replace(/[.,;:!?।]+$/g, "");
  if (stripMarkup.length <= maxLength) return stripMarkup;
  const sentenceMatch = stripMarkup.match(/^.{1,180}[।.!?;,]/);
  return sentenceMatch ? sentenceMatch[0] : stripMarkup.slice(0, maxLength).trimEnd();
}

function translateTtsLang(languageCode: string): string {
  const lookup: Record<string, string> = {
    "en-IN": "en",
    "hi-IN": "hi",
    "bn-IN": "bn",
    "mr-IN": "mr",
    "ta-IN": "ta",
    "te-IN": "te",
    "kn-IN": "kn",
    "gu-IN": "gu",
  };
  return lookup[languageCode] ?? "en";
}

export async function generateSpeech(text: string, languageCode: string) {
  if (GOOGLE_CLOUD_TTS_LANGUAGES.has(languageCode)) {
    try {
      assertGoogleCredentials();
      client ??= createClient();

      const voiceName = VOICES[languageCode];

      const [response] = await client.synthesizeSpeech({
        input: {
          text,
        },

        voice: {
          languageCode,
          name: voiceName,
        },

        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 0.92,
          pitch: 0,
        },
      });

      if (response.audioContent && response.audioContent.length > 0) {
        return response.audioContent;
      }
      console.info("Google Cloud TTS produced no audio; falling back to Translate TTS", {
        languageCode,
      });
    } catch (error) {
      if (error instanceof GoogleProviderUnavailableError) {
        console.info("Google Cloud TTS unavailable; falling back to Translate TTS", {
          languageCode,
        });
      } else {
        console.error("Google Cloud TTS failed; falling back to Translate TTS", {
          languageCode,
          error,
        });
      }
    }
  }

  // Fallback provider for unconfigured environments and unsupported languages.
  return generateTranslateSpeech(text, languageCode);
}