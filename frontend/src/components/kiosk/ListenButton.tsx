import { useCallback, useEffect, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";
import { speak, stopSpeaking } from "@/lib/speech";
import { useLanguage } from "@/lib/kiosk-hooks";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  label?: string;
  size?: "sm" | "md";
  autoPlay?: boolean;
  className?: string;
};

export function ListenButton({ text, label = "Listen", size = "md", autoPlay, className }: Props) {
  const { language, t } = useLanguage();
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const play = useCallback(() => {
    setError(false);
    setLoading(true);
    setSpeaking(false);
    void speak(
      text,
      () => {
        setLoading(false);
        setSpeaking(false);
      },
      () => {
        setLoading(false);
        setSpeaking(false);
        setError(true);
      },
    )
      .then(() => {
        setLoading(false);
        setSpeaking(false);
      })
      .catch(() => {
        setLoading(false);
        setSpeaking(false);
        setError(true);
      });
  }, [text]);

  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setTimeout(() => {
      play();
    }, 400);
    return () => {
      window.clearTimeout(id);
      stopSpeaking();
      setSpeaking(false);
    };
  }, [autoPlay, language, play]);

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      setLoading(false);
      return;
    }
    if (loading) {
      stopSpeaking();
      setLoading(false);
      return;
    }
    setSpeaking(true);
    play();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking || loading ? t("stop") : `${label}: ${text}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full bg-accent font-semibold text-accent-foreground transition-transform active:scale-95",
        "border border-primary/15 shadow-card hover:brightness-[0.98]",
        size === "md" ? "min-h-14 px-6 text-lg" : "min-h-11 px-4 text-base",
        speaking && "animate-pulse-ring",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="size-5 shrink-0 animate-spin" />
      ) : speaking ? (
        <Square className="size-5 shrink-0" />
      ) : (
        <Volume2 className="size-6 shrink-0" />
      )}
      <span className="truncate">
        {error
          ? t("voiceError")
          : loading || speaking
            ? t("stop")
            : label === "Listen"
              ? t("listen")
              : label}
      </span>
    </button>
  );
}
