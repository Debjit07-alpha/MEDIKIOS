import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  tone?: "default" | "ayush";
  trailing?: ReactNode;
  className?: string;
};

export function BigChoice({
  title,
  subtitle,
  icon,
  selected,
  onClick,
  tone = "default",
  trailing,
  className,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group flex w-full min-h-24 items-center gap-4 rounded-3xl border-2 bg-card p-5 text-left transition-all",
        "shadow-card hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 active:scale-[0.99]",
        selected
          ? tone === "ayush"
            ? "border-ayush bg-ayush-soft"
            : "border-primary bg-primary-soft"
          : "border-border",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "grid size-16 shrink-0 place-items-center rounded-2xl text-3xl",
            tone === "ayush" ? "bg-ayush-soft text-ayush" : "bg-accent text-primary",
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-2xl font-extrabold leading-tight text-foreground">{title}</span>
        {subtitle ? (
          <span className="mt-1 block text-lg text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {trailing}
    </button>
  );
}
