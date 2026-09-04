/** Browser speech helpers. All calls are safe to run during SSR (they no-op). */

let currentLocale = "en-IN";

export function setSpeechLocale(locale: string) {
  currentLocale = locale;
}

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, onEnd?: () => void) {
  if (!speechSupported()) {
    onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = currentLocale;
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
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
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = currentLocale;
  recognition.interimResults = false;
  recognition.continuous = false;
  return recognition;
}
