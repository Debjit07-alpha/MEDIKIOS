import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { speak, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  label?: string;
  size?: "sm" | "md";
  autoPlay?: boolean;
  className?: string;
};

export function ListenButton({ text, label = "Listen", size = "md", autoPlay, className }: Props) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setTimeout(() => {
      setSpeaking(true);
      speak(text, () => setSpeaking(false));
    }, 400);
    return () => {
      window.clearTimeout(id);
      stopSpeaking();
      setSpeaking(false);
    };
  }, [text, autoPlay]);

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(text, () => setSpeaking(false));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking ? "Stop audio" : `${label}: ${text}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full bg-accent font-semibold text-accent-foreground transition-transform active:scale-95",
        "border border-primary/15 shadow-card hover:brightness-[0.98]",
        size === "md" ? "min-h-14 px-6 text-lg" : "min-h-11 px-4 text-base",
        speaking && "animate-pulse-ring",
        className,
      )}
    >
      {speaking ? <Square className="size-5 shrink-0" /> : <Volume2 className="size-6 shrink-0" />}
      <span className="truncate">{speaking ? "Stop" : label}</span>
    </button>
  );
}
