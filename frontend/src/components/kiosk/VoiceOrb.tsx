import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Loader2, Volume2, Check, Square } from "lucide-react";
import { createRecognition, speak, stopSpeaking, transcribeAudio } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/kiosk-hooks";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "confirmed";

type Props = {
  prompt: string;
  matches: { id: string; label: string }[];
  onResolved: (optionId: string, transcript: string) => void;
};

export function VoiceOrb({ prompt, matches, onResolved }: Props) {
  const { t } = useLanguage();
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timers = useRef<number[]>([]);

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
    setState("idle");
    setTranscript("");
    setError(false);
    clearTimers();
    stopRecording();
    stopSpeaking();
    return () => {
      clearTimers();
      stopRecording();
      stopSpeaking();
    };
  }, [prompt, clearTimers, stopRecording]);

  const resolve = useCallback(
    (heard: string) => {
      setTranscript(heard);
      setState("processing");
      const normalized = heard.trim().toLocaleLowerCase();
      const hit =
        matches.find((match) => normalized.includes(match.label.trim().toLocaleLowerCase())) ??
        matches.find((match) =>
          match.label
            .toLocaleLowerCase()
            .split(/[^a-z]+/)
            .filter((word) => word.length > 3)
            .some((word) => normalized.includes(word)),
        ) ??
        matches[0];

      if (!hit) {
        setError(true);
        setState("idle");
        return;
      }

      setState("speaking");
      void speak(
        `${hit.label}. ${t("continueQuestions")}.`,
        () => {
          setState("confirmed");
          timers.current.push(window.setTimeout(() => onResolved(hit.id, heard), 600));
        },
        () => {
          setError(true);
          setState("idle");
        },
      ).catch(() => {
        setError(true);
        setState("idle");
      });
    },
    [matches, onResolved, t],
  );

  const browserFallback = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) {
      setError(true);
      setState("idle");
      return;
    }
    recognition.onresult = (event) => {
      const heard = event.results[0]?.[0]?.transcript ?? "";
      resolve(heard);
    };
    recognition.onerror = () => {
      setError(true);
      setState("idle");
    };
    recognition.start();
  }, [resolve]);

  const start = async () => {
    if (state === "listening") {
      stopRecording();
      return;
    }
    if (state !== "idle") return;
    setError(false);
    setTranscript("");
    stopSpeaking();

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("listening");
      browserFallback();
      return;
    }

    try {
      console.info("Microphone permission requested");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.info("Microphone permission granted");
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
        setState("processing");
        try {
          const result = await transcribeAudio(new Blob(chunks, { type: mimeType }));
          if (!result.text) throw new Error("STT returned no transcript");
          resolve(result.text);
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
      browserFallback();
    }
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
