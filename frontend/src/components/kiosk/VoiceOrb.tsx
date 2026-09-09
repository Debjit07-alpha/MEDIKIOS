import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Loader2, Volume2, Check, Square } from "lucide-react";
import {
  createRecognition,
  getRecognitionGeneration,
  getSpeechLocale,
  matchVoiceToOption,
  recognizeFreeFormVoice,
  speak,
  stopRecognition,
  stopSpeaking,
  transcribeAudio,
} from "@/lib/speech";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/kiosk-hooks";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "confirmed";

type Props = {
  prompt: string;
  matches: { id: string; label: string }[];
  onResolved: (optionId: string | null, transcript: string) => void;
};

export function VoiceOrb({ prompt, matches, onResolved }: Props) {
  const { language, t } = useLanguage();
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timers = useRef<number[]>([]);
  /** True when the patient tapped stop or navigated away mid-recording. */
  const cancelledRecording = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const stopRecording = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  useEffect(() => {
    console.info("[VOICE DEBUG] VoiceOrb mounted/reset", {
      selectedLanguage: language,
      speechLocale: getSpeechLocale(),
    });
    setState("idle");
    setTranscript("");
    setError(false);
    clearTimers();
    stopRecognition();
    stopRecording();
    stopSpeaking();
    cancelledRecording.current = true;
    return () => {
      clearTimers();
      stopRecognition();
      stopRecording();
      stopSpeaking();
      cancelledRecording.current = true;
    };
  }, [prompt, clearTimers, stopRecording, language]);

  const handleResult = useCallback(
    (optionId: string | null, heard: string) => {
      const transcript = heard.trim();
      if (!transcript) {
        setError(true);
        setState("idle");
        return;
      }
      setTranscript(transcript);
      setState("speaking");

      const feedbackText = optionId
        ? `${matches.find((match) => match.id === optionId)?.label ?? ""}. ${t(
            "continueQuestions",
          )}.`
        : `${t("voiceGotIt")}. ${t("continueQuestions")}.`;

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        setState("confirmed");
        timers.current.push(window.setTimeout(() => onResolved(optionId, transcript), 600));
      };

      // TTS is optional: it must never block the voice answer flow.
      const cap = window.setTimeout(finish, 5000);
      timers.current.push(cap);
      void speak(feedbackText, finish, finish).catch(finish);
    },
    [matches, onResolved, t],
  );

  const startBackendRecording = useCallback(async () => {
    console.info("[VOICE DEBUG] Backend STT fallback engaged", {
      speechLocale: getSpeechLocale(),
    });
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(true);
      setState("idle");
      return;
    }

    cancelledRecording.current = false;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = mediaStream;
      const chunks: BlobPart[] = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      mediaRecorder.onerror = (event) => {
        console.error("Audio recording error", event);
        setError(true);
        setState("idle");
      };
      mediaRecorder.onstop = async () => {
        mediaStream.getTracks().forEach((track) => track.stop());
        stream.current = null;
        if (cancelledRecording.current) {
          setState("idle");
          return;
        }
        setState("processing");
        try {
          const result = await transcribeAudio(new Blob(chunks, { type: mimeType }));
          if (!result.text) throw new Error("STT returned no transcript");
          handleResult(matchVoiceToOption(result.text, matches), result.text);
        } catch (error) {
          console.error("Speech transcription failed", error);
          setError(true);
          setState("idle");
        }
      };
      setState("listening");
      mediaRecorder.start();
      timers.current.push(window.setTimeout(stopRecording, 8000));
    } catch (error) {
      console.error("Microphone permission or recording failed", error);
      setError(true);
      setState("idle");
    }
  }, [handleResult, matches, stopRecording]);

  const start = async () => {
    if (state === "listening") {
      cancelledRecording.current = true;
      stopRecognition();
      stopRecording();
      return;
    }
    if (state !== "idle") return;
    setError(false);
    setTranscript("");
    stopSpeaking();

    setState("listening");

    // PRIMARY: browser SpeechRecognition (no backend required).
    if (createRecognition()) {
      console.info("[VOICE DEBUG] Voice input: browser SpeechRecognition (primary)", {
        recognitionLocale: getSpeechLocale(),
      });
      const generationAtStart = getRecognitionGeneration();
      recognizeFreeFormVoice(matches)
        .then((result) => handleResult(result.optionId, result.transcript))
        .catch((error: Error & { code?: string }) => {
          if (getRecognitionGeneration() !== generationAtStart) {
            setState("idle");
            return;
          }
          if (error.code === "no-speech" || error.code === "cancelled") {
            setError(false);
            setState("idle");
            return;
          }
          console.warn("[VOICE DEBUG] Browser recognition failed; using backend STT", error);
          void startBackendRecording();
        });
      return;
    }

    // FALLBACK: browser SpeechRecognition is unavailable, so use the
    // MediaRecorder + backend STT path instead.
    console.info("[VOICE DEBUG] Voice input: browser SpeechRecognition unavailable", {
      speechLocale: getSpeechLocale(),
    });
    void startBackendRecording();
  };

  const copy = {
    idle: { title: t("voiceSpeak"), hint: t("voiceHint") },
    listening: { title: t("voiceListening"), hint: t("voiceHint") },
    processing: { title: t("voiceProcessing"), hint: t("voiceHint") },
    speaking: { title: t("voiceReading"), hint: t("voiceHint") },
    confirmed: { title: t("voiceGotIt"), hint: t("voiceHint") },
  }[state];

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border bg-card p-6 text-center shadow-card">
      <button
        type="button"
        onClick={start}
        aria-label={state === "listening" ? t("stop") : t("voiceSpeak")}
        className={cn(
          "grid size-28 place-items-center rounded-full transition-all active:scale-95",
          state === "listening"
            ? "animate-pulse-ring bg-primary text-primary-foreground"
            : state === "confirmed"
              ? "bg-success text-success-foreground"
              : "bg-accent text-primary",
        )}
      >
        {state === "listening" ? (
          <Square className="size-12" />
        ) : state === "processing" ? (
          <Loader2 className="size-12 animate-spin" />
        ) : state === "speaking" ? (
          <Volume2 className="size-12" />
        ) : state === "confirmed" ? (
          <Check className="size-14" />
        ) : (
          <Mic className="size-12" />
        )}
      </button>
      <div>
        <p className="text-xl font-extrabold text-foreground">{copy.title}</p>
        <p className="text-base text-muted-foreground">{error ? t("voiceError") : copy.hint}</p>
      </div>
      {transcript ? (
        <p className="rounded-2xl bg-muted px-4 py-2 text-lg italic text-muted-foreground">
          “{transcript}”
        </p>
      ) : null}
    </div>
  );
}
