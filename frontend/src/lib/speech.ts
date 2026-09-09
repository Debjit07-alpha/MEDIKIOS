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
  return new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLocale;
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => {
      if (generation === speechGeneration) onEnd?.();
      resolve();
    };
    utterance.onerror = (event) => reject(new Error(`Browser speech failed: ${event.error}`));
    window.speechSynthesis.speak(utterance);
  });
}

async function playBackendSpeech(text: string, generation: number, onEnd?: () => void) {
  activeRequest = new AbortController();
  console.info("TTS request", { languageCode: currentLocale, textLength: text.length });
  const response = await fetch(`${API_URL}/api/voice/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, languageCode: currentLocale }),
    signal: activeRequest.signal,
  });
  console.info("TTS response", { languageCode: currentLocale, status: response.status });
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
  return recognition;
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
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
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
      fail("Speech recognition failed");
    };
    recognition.onend = () => {
      if (settled) return;
      if (generation !== recognitionGeneration) {
        fail("Speech recognition stopped");
        return;
      }
      fail("No speech detected");
    };
    recognition.start();
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
