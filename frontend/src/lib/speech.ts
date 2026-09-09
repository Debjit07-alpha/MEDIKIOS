/** Backend-first voice transport with browser speech as a resilience fallback. */

const API_URL = import.meta.env["VITE_API_URL"] || "http://localhost:5000";
const FALLBACK_LOCALE = "en-IN";

let currentLocale = FALLBACK_LOCALE;
let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let activeRequest: AbortController | null = null;
let speechGeneration = 0;
let activeRecognition: RecognitionLike | null = null;
let recognitionGeneration = 0;

export type TranscriptionResult = {
  success: boolean;
  text: string;
  languageCode: string;
  confidence: number;
};

export function setSpeechLocale(locale: string) {
  currentLocale = locale || FALLBACK_LOCALE;
  console.info("Speech locale changed", { languageCode: currentLocale });
}

export function getSpeechLocale() {
  return currentLocale;
}

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshBrowserVoices() {
  if (!speechSupported()) return;
  cachedVoices = window.speechSynthesis.getVoices() ?? [];
}

/**
 * `getVoices()` is async in Chrome/Edge: voices appear after the
 * "voiceschanged" event. Wait for them so `speechSynthesis.speak()` never
 * fires with an empty voice list (which can silently never call onend).
 */
function waitForBrowserVoices(timeoutMs = 2500) {
  return new Promise<void>((resolve) => {
    if (!speechSupported()) {
      resolve();
      return;
    }
    const synth = window.speechSynthesis;
    refreshBrowserVoices();
    if (cachedVoices.length > 0) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      refreshBrowserVoices();
      synth.removeEventListener?.("voiceschanged", onChanged);
      resolve();
    };
    const onChanged = () => finish();
    synth.addEventListener?.("voiceschanged", onChanged);
    window.setTimeout(finish, timeoutMs);
  });
}

/**
 * Best voice for the current locale:
 * 1. exact locale match (gu-IN -> gu-IN),
 * 2. same language code (gu-IN -> any gu-*),
 * 3. no match -> null (caller skips narration instead of guessing a voice).
 */
function pickBrowserVoice() {
  refreshBrowserVoices();
  const target = currentLocale.trim().toLowerCase().replace(/_/g, "-");
  const targetLang = target.split("-")[0];
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = 0;
  for (const voice of cachedVoices) {
    const voiceLang = voice.lang.trim().toLowerCase().replace(/_/g, "-");
    const voiceLangCode = voiceLang.split("-")[0];
    let score = 0;
    if (voiceLang === target) score = 3;
    else if (voiceLangCode && voiceLangCode === targetLang) score = 2;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

function clearAudio() {
  if (activeAudio) {
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

export function stopSpeaking() {
  speechGeneration += 1;
  activeRequest?.abort();
  activeRequest = null;
  clearAudio();
  if (speechSupported()) window.speechSynthesis.cancel();
}

function browserSpeak(text: string, generation: number, onEnd?: () => void) {
  if (!speechSupported()) throw new Error("No browser speech fallback is available");
  return waitForBrowserVoices().then(() => {
    const voice = pickBrowserVoice();
    if (!voice) {
      console.info("[VOICE DEBUG] No browser TTS voice for locale, skipping narration", {
        ttsLocale: currentLocale,
        availableVoices: cachedVoices.map((v) => v.lang),
      });
      return;
    }
    console.info("[VOICE DEBUG] Browser TTS", {
      ttsLocale: currentLocale,
      voice: voice.name,
      voiceLang: voice.lang,
    });
    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLocale;
      utterance.voice = voice;
      utterance.rate = 0.92;
      utterance.pitch = 1;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(guard);
        if (error) {
          reject(error);
          return;
        }
        if (generation === speechGeneration) onEnd?.();
        resolve();
      };
      // Hard guarantee: a browser that never fires onend/onerror must not
      // wedge the UI. Cancel and surface a controlled error instead.
      const guard = window.setTimeout(() => {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
        finish(new Error("Browser speech timed out"));
      }, 15000);
      utterance.onend = () => finish();
      utterance.onerror = (event) => {
        const code = event.error;
        if (code === "canceled" || code === "interrupted") {
          if (generation !== speechGeneration) {
            finish();
            return;
          }
          finish(new Error(`Browser speech interrupted: ${code}`));
          return;
        }
        finish(new Error(`Browser speech failed: ${code}`));
      };
      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        finish(error instanceof Error ? error : new Error("Speech synthesis threw"));
      }
    });
  });
}

async function playBackendSpeech(text: string, generation: number, onEnd?: () => void) {
  const controller = new AbortController();
  activeRequest = controller;
  console.info("[VOICE DEBUG] TTS request", { ttsLocale: currentLocale, textLength: text.length });
  const requestTimeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_URL}/api/voice/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, languageCode: currentLocale }),
      signal: controller.signal,
    });
    console.info("[VOICE DEBUG] TTS response", {
      ttsLocale: currentLocale,
      status: response.status,
    });
    if (!response.ok) throw new Error(`TTS backend returned ${response.status}`);

    const blob = await response.blob();
    if (generation !== speechGeneration) return;
    activeObjectUrl = URL.createObjectURL(blob);
    activeAudio = new Audio(activeObjectUrl);
    const audio = activeAudio;
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        clearAudio();
        onEnd?.();
        resolve();
      };
      audio.onerror = () => {
        clearAudio();
        reject(new Error("Generated audio could not be played"));
      };
      audio.play().catch(reject);
    });
  } finally {
    window.clearTimeout(requestTimeout);
    if (activeRequest === controller) activeRequest = null;
  }
}

export async function speak(text: string, onEnd?: () => void, onError?: (error: Error) => void) {
  stopSpeaking();
  const generation = speechGeneration;
  try {
    await playBackendSpeech(text, generation, onEnd);
  } catch (backendError) {
    if (generation !== speechGeneration) return;
    console.error("Backend TTS failed; trying browser fallback", {
      languageCode: currentLocale,
      error: backendError,
    });
    try {
      await browserSpeak(text, generation, onEnd);
    } catch (fallbackError) {
      const error = fallbackError instanceof Error ? fallbackError : new Error("Speech failed");
      console.error("TTS fallback failed", { languageCode: currentLocale, error });
      onError?.(error);
      throw error;
    }
  }
}

export async function transcribeAudio(blob: Blob): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("audio", blob, "kiosk-recording.webm");
  formData.append("languageCode", currentLocale);
  console.info("STT request", {
    languageCode: currentLocale,
    mimeType: blob.type,
    bytes: blob.size,
  });

  const response = await fetch(`${API_URL}/api/voice/transcribe`, {
    method: "POST",
    body: formData,
  });
  console.info("STT response", { languageCode: currentLocale, status: response.status });
  const result = (await response.json()) as TranscriptionResult & { error?: string };
  if (!response.ok || !result.success) {
    throw new Error(result.error || `STT backend returned ${response.status}`);
  }
  return result;
}

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export function createRecognition(): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = currentLocale;
  recognition.interimResults = false;
  recognition.continuous = false;
  console.info("[VOICE DEBUG] Recognition session started", {
    recognitionLocale: currentLocale,
    interimResults: recognition.interimResults,
    continuous: recognition.continuous,
  });
  return recognition;
}

/** Read by VoiceOrb to detect that the user cancelled recognition. */
export function getRecognitionGeneration() {
  return recognitionGeneration;
}

// ---------------------------------------------------------------------------
// Free-form voice answers
// ---------------------------------------------------------------------------

export type VoiceMatchOption = {
  id: string;
  label: string;
};

export type FreeFormVoiceResult = {
  transcript: string;
  optionId: string | null;
};

export function normalizeSpeechText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLocaleLowerCase(getSpeechLocale());
}

/**
 * Match a spoken transcript against predefined answer options.
 * Returns the option id when a confident match exists, otherwise null.
 * It NEVER falls back to the first option: an unknown patient complaint
 * remains a free-form answer.
 */
export function matchVoiceToOption(transcript: string, options: VoiceMatchOption[]): string | null {
  const normalized = normalizeSpeechText(transcript);
  if (!normalized) return null;

  let best: string | null = null;
  let bestScore = 0;
  for (const option of options) {
    const label = normalizeSpeechText(option.label);
    if (!label) continue;
    // Full phrase containment is the strongest signal.
    if (normalized.includes(label)) return option.id;
    // Otherwise require at least two significant option words to be present.
    const words = label.split(/[^a-z0-9]+/).filter((word) => word.length > 3);
    if (words.length === 0) continue;
    const score = words.filter((word) => normalized.includes(word)).length;
    if (score > bestScore) {
      bestScore = score;
      best = option.id;
    }
  }
  return bestScore >= 2 ? best : null;
}

/**
 * Capture speech through the browser's SpeechRecognition API and match it
 * against the provided answer options. Uses the currently selected speech
 * language. Unmatched speech is preserved as a free-form transcript with
 * optionId = null. Works entirely in the browser: the backend is not required.
 */
export function recognizeFreeFormVoice(
  options: VoiceMatchOption[],
  timeoutMs = 8000,
): Promise<FreeFormVoiceResult> {
  return new Promise((resolve, reject) => {
    const recognition = createRecognition();
    if (!recognition) {
      reject(new Error("Speech recognition is not supported in this browser"));
      return;
    }
    const generation = recognitionGeneration + 1;
    recognitionGeneration = generation;
    activeRecognition = recognition;

    let settled = false;
    const cleanup = () => {
      window.clearTimeout(timer);
      if (activeRecognition === recognition) activeRecognition = null;
    };
    const finish = (transcript: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        transcript,
        optionId: matchVoiceToOption(transcript, options),
      });
    };
    const fail = (message: string, code?: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      const error = new Error(message) as Error & { code?: string };
      if (code) error.code = code;
      reject(error);
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      fail("No speech detected");
    }, timeoutMs);

    recognition.onresult = (event) => {
      const heard = event.results[0]?.[0]?.transcript ?? "";
      finish(heard.trim());
    };
    recognition.onerror = () => {
      if (settled) return;
      fail("Speech recognition failed", "recognition-error");
    };
    recognition.onend = () => {
      if (settled) return;
      if (generation !== recognitionGeneration) {
        fail("Speech recognition stopped", "cancelled");
        return;
      }
      fail("No speech detected", "no-speech");
    };
    try {
      recognition.start();
    } catch (error) {
      fail(
        error instanceof Error
          ? `Speech recognition failed to start: ${error.message}`
          : "Speech recognition failed to start",
        "recognition-start-error",
      );
    }
  });
}

/**
 * Stop the currently active browser speech recognition, if any.
 * A recognition stopped this way rejects instead of resolving, so a stale
 * answer is never applied after the user cancels or navigates away.
 */
export function stopRecognition() {
  recognitionGeneration += 1;
  try {
    activeRecognition?.stop();
  } catch {
    /* ignore */
  }
  activeRecognition = null;
}
