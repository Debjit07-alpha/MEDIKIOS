import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { HeartPulse, HelpCircle, Home, Check } from "lucide-react";
import { STEPS, type StepId, LANGUAGES } from "@/lib/kiosk-data";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { RedFlagOverlay } from "./RedFlagOverlay";
import { ListenButton } from "./ListenButton";
import { cn } from "@/lib/utils";

export function KioskShell({
  step,
  children,
  showSteps = true,
}: {
  step?: StepId;
  children: ReactNode;
  showSteps?: boolean;
}) {
  const { patient, language } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const activeIndex = STEPS.findIndex((s) => s.id === step);
  const lang = LANGUAGES.find((l) => l.code === language);
  const stepLabels = {
    language: t("stepLanguage"),
    consent: t("stepConsent"),
    identity: t("stepIdentity"),
    care: t("stepCare"),
    start: t("stepStart"),
    questions: t("stepQuestions"),
    papers: t("stepPapers"),
    timeline: t("stepTimeline"),
    summary: t("stepSummary"),
    share: t("stepShare"),
  };

  return (
    <div className="kiosk-surface min-h-screen">
      <header className="border-b border-border/70 bg-card/70 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <HeartPulse className="size-7" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-2xl font-extrabold leading-none">MediKiosk</span>
              <span className="block truncate text-sm text-muted-foreground">
                {t("guidedAssistant")}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {patient ? (
              <div className="hidden rounded-full border border-border bg-card px-4 py-2 text-center sm:block">
                <p className="text-base font-bold leading-tight">{patient.name}</p>
                <p className="text-xs text-muted-foreground">
                  {patient.age} yrs · {patient.sex} · {patient.uhid}
                </p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => navigate({ to: "/language" })}
              className="min-h-11 rounded-full border border-border bg-card px-4 text-base font-semibold"
            >
              {lang?.native ?? "English"}
            </button>
            <Link
              to="/help"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-warning/40 bg-warning-soft px-4 text-base font-bold text-warning-foreground"
            >
              <HelpCircle className="size-5" /> {t("help")}
            </Link>
            <Link
              to="/"
              aria-label={t("home")}
              className="grid size-11 place-items-center rounded-full border border-border bg-card"
            >
              <Home className="size-5" />
            </Link>
          </div>
        </div>

        {showSteps ? (
          <nav
            aria-label="Progress"
            className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-3 sm:px-6"
          >
            {STEPS.map((s, i) => {
              const done = activeIndex > i;
              const active = activeIndex === i;
              return (
                <div key={s.id} className="flex shrink-0 items-center gap-1">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap",
                      active
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-success-soft text-success"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : <span>{i + 1}</span>}
                    {stepLabels[s.id]}
                  </span>
                  {i < STEPS.length - 1 ? <span className="h-px w-3 bg-border" /> : null}
                </div>
              );
            })}
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <RedFlagOverlay />
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  listenText,
}: {
  title: ReactNode;
  subtitle?: string;
  listenText?: string;
}) {
  return (
    <div className="animate-rise mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <h1 className="text-balance-tight text-4xl leading-tight sm:text-5xl">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-lg text-muted-foreground sm:text-xl">{subtitle}</p>
        ) : null}
      </div>
      {listenText ? <ListenSlot text={listenText} /> : null}
    </div>
  );
}

function ListenSlot({ text }: { text: string }) {
  return <ListenButton text={text} autoPlay={false} />;
}
