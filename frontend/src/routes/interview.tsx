import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { VoiceOrb } from "@/components/kiosk/VoiceOrb";
import { questionsForMode, type Question } from "@/lib/kiosk-data";
import { useKiosk } from "@/lib/kiosk-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/interview")({
  head: () => ({
    meta: [
      { title: "AI clinical interview — MediKiosk" },
      { name: "description", content: "Adaptive history taking by voice or large touch options, with instant red-flag detection for emergency symptoms." },
      { property: "og:title", content: "AI clinical interview — MediKiosk" },
      { property: "og:description", content: "Every question can be spoken or touched, and answers map to structured clinical fields." },
    ],
  }),
  component: InterviewPage,
});

function InterviewPage() {
  const { careMode, answers, answer, raiseRedFlag } = useKiosk();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const pool = useMemo(() => questionsForMode(careMode ?? "allopathy"), [careMode]);
  const visible = useMemo(
    () => pool.filter((q) => (q.showIf ? q.showIf(answers) : true)),
    [pool, answers],
  );
  const question: Question | undefined = visible[Math.min(index, visible.length - 1)];
  const selected = question ? (answers[question.id] ?? []) : [];

  if (!question) return null;

  const progress = Math.round(((index + 1) / visible.length) * 100);

  const choose = (optionId: string) => {
    const option = question.options.find((o) => o.id === optionId);
    const next = question.multi
      ? selected.includes(optionId)
        ? selected.filter((v) => v !== optionId)
        : [...selected.filter((v) => v !== "none"), optionId].filter((v) =>
            optionId === "none" ? v === "none" : true,
          )
      : [optionId];
    answer(question.id, next);

    if (option?.redFlag) {
      raiseRedFlag({
        label: "Possible emergency symptom detected",
        detail: `${question.prompt} — patient answered “${option.label}”.`,
        at: new Date().toISOString(),
      });
      return;
    }
    if (!question.multi) window.setTimeout(goNext, 350);
  };

  const goNext = () => {
    if (index + 1 >= visible.length) {
      navigate({ to: "/papers" });
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <KioskShell step="questions">
      <div className="mb-6">
        <div className="flex items-center justify-between text-lg font-semibold text-muted-foreground">
          <span>
            Question {index + 1} of {visible.length}
          </span>
          <span className="rounded-full bg-accent px-4 py-1 text-primary">{question.section}</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="animate-rise grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="text-balance-tight text-4xl leading-tight sm:text-5xl">
            {question.prompt}
          </h1>
          {question.hint ? (
            <p className="mt-2 text-xl text-muted-foreground">{question.hint}</p>
          ) : null}
        </div>
        <ListenButton key={question.id} text={`${question.prompt}. ${question.hint ?? ""}`} autoPlay />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {question.options.map((o) => {
            const on = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => choose(o.id)}
                aria-pressed={on}
                className={cn(
                  "flex min-h-32 items-center gap-4 rounded-3xl border-2 bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]",
                  on ? "border-primary bg-primary-soft" : "border-border",
                )}
              >
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent text-4xl">
                  {o.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-2xl font-extrabold leading-tight">{o.label}</span>
                  {o.sublabel ? (
                    <span className="block text-lg text-muted-foreground">{o.sublabel}</span>
                  ) : null}
                </span>
                {on ? <Check className="size-8 shrink-0 text-primary" /> : null}
              </button>
            );
          })}
        </div>

        <VoiceOrb
          key={question.id}
          prompt={question.prompt}
          matches={question.options.map((o) => ({ id: o.id, label: o.label }))}
          onResolved={(optionId) => choose(optionId)}
        />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => (index === 0 ? navigate({ to: "/dashboard" }) : setIndex((i) => i - 1))}
          className="inline-flex min-h-16 items-center gap-2 rounded-full border-2 border-border bg-card px-8 text-xl font-bold"
        >
          <ArrowLeft className="size-6" /> Back
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={selected.length === 0}
          className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-2xl font-extrabold text-primary-foreground shadow-lift transition-opacity disabled:opacity-40"
        >
          {index + 1 >= visible.length ? "Finish questions" : "Next"} <ArrowRight className="size-7" />
        </button>
      </div>
    </KioskShell>
  );
}
