import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Loader2, Volume2, Check } from "lucide-react";
import { createRecognition, speak, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "confirmed";

type Props = {
  /** Spoken prompt for the current question. */
  prompt: string;
  /** Words the engine can map a spoken answer onto. */
  matches: { id: string; label: string }[];
  onResolved: (optionId: string, transcript: string) => void;
};

const STATE_COPY: Record<VoiceState, { title: string; hint: string }> = {
  idle: { title: "Speak your answer", hint: "Touch the microphone and talk normally" },
  listening: { title: "I am listening…", hint: "Please speak now" },
  processing: { title: "Understanding…", hint: "One moment" },
  speaking: { title: "Reading it back", hint: "Listen to what I understood" },
  confirmed: { title: "Got it", hint: "Your answer is saved" },
};

export function VoiceOrb({ prompt, matches, onResolved }: Props) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => {
    setState("idle");
    setTranscript("");
    clearTimers();
    return clearTimers;
  }, [prompt, clearTimers]);

  const resolve = useCallback(
    (heard: string) => {
      setTranscript(heard);
      setState("processing");
      const lower = heard.toLowerCase();
      const hit =
        matches.find((m) =>
          m.label
            .toLowerCase()
            .split(/[^a-z]+/)
            .filter((w) => w.length > 3)
            .some((w) => lower.includes(w)),
        ) ?? matches[0];
      if (!hit) {
        setState("idle");
        return;
      }

      timers.current.push(
        window.setTimeout(() => {
          setState("speaking");
          speak(`You said ${hit.label}. Saving it.`, () => {
            setState("confirmed");
            timers.current.push(
              window.setTimeout(() => onResolved(hit.id, heard), 600),
            );
          });
        }, 900),
      );
    },
    [matches, onResolved],
  );

  const start = () => {
    if (state !== "idle") return;
    stopSpeaking();
    setState("listening");
    const recognition = createRecognition();
    if (!recognition) {
      // Kiosk demo fallback when the browser has no speech engine.
      timers.current.push(
        window.setTimeout(() => resolve(matches[0]?.label ?? "yes"), 2200),
      );
      return;
    }
    recognition.onresult = (event) => {
      const heard = event.results[0]?.[0]?.transcript ?? "";
      resolve(heard);
    };
    recognition.onerror = () => resolve(matches[0]?.label ?? "yes");
    recognition.start();
  };

  const copy = STATE_COPY[state];

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border bg-card p-6 text-center shadow-card">
      <button
        type="button"
        onClick={start}
        aria-label="Answer with your voice"
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
          <span className="flex h-10 items-end gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-2 rounded-full bg-primary-foreground"
                style={{
                  height: "100%",
                  animation: `kiosk-bar 900ms ease-in-out ${i * 110}ms infinite`,
                }}
              />
            ))}
          </span>
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
        <p className="text-base text-muted-foreground">{copy.hint}</p>
      </div>
      {transcript ? (
        <p className="rounded-2xl bg-muted px-4 py-2 text-lg italic text-muted-foreground">
          “{transcript}”
        </p>
      ) : null}
    </div>
  );
}
