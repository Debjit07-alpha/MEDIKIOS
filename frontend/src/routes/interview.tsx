import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Mic } from "lucide-react";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { VoiceOrb } from "@/components/kiosk/VoiceOrb";
import { questionsForMode, type Question } from "@/lib/kiosk-data";
import { hasLocalizedQuestionPrompt, localizeQuestion } from "@/lib/question-i18n";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { getSpeechLocale } from "@/lib/speech";
import { api } from "@/lib/api";
import { canonicalPatientId } from "@/lib/patient";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/interview")({
  head: () => ({
    meta: [
      { title: "AI clinical interview — MediKiosk" },
      {
        name: "description",
        content:
          "Adaptive history taking by voice or large touch options, with instant red-flag detection for emergency symptoms.",
      },
      { property: "og:title", content: "AI clinical interview — MediKiosk" },
      {
        property: "og:description",
        content:
          "Every question can be spoken or touched, and answers map to structured clinical fields.",
      },
    ],
  }),
  component: InterviewPage,
});

function InterviewPage() {
  const {
    careMode,
    answers,
    answer,
    patient,
    sessionId,
    setSessionId,
    consent,
    consentSynced,
    markConsentSynced,
    voiceAnswers,
    voiceAnswer,
    raiseRedFlag,
  } = useKiosk();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const patientId = canonicalPatientId(patient);

  // ONE kiosk session = ONE patient = ONE interview session.
  // Created once when Questions starts; every answer reuses it.
  useEffect(() => {
    if (!patientId) {
      navigate({ to: "/identity" });
      return;
    }
    if (sessionId) return;
    let cancelled = false;
    api.interview
      .ensureSession({ patientId, careMode: careMode ?? "allopathy" })
      .then((res) => {
        if (!cancelled && res?.data?.id) setSessionId(res.data.id);
      })
      .catch((error) => {
        console.error("Failed to create interview session", error);
        if (!cancelled) setSessionError("Could not start the interview session. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, sessionId, careMode, setSessionId, navigate]);

  // Persist the consent row against the canonical patient once it exists.
  useEffect(() => {
    if (!patientId || !consent || consentSynced) return;
    api.consents
      .save({ patientId, purpose: "kiosk_care", consentGiven: true })
      .then(() => markConsentSynced())
      .catch((error) => console.error("Failed to sync consent", error));
  }, [patientId, consent, consentSynced, markConsentSynced]);

  const pool = useMemo(() => questionsForMode(careMode ?? "allopathy"), [careMode]);
  const visible = useMemo(
    () => pool.filter((q) => (q.showIf ? q.showIf(answers) : true)),
    [pool, answers],
  );
  const question: Question | undefined = visible[Math.min(index, visible.length - 1)];
  const localizedQuestion = question ? localizeQuestion(question, language) : undefined;
  const selected = question ? (answers[question.id] ?? []) : [];
  const voiceAnswerText = question ? (voiceAnswers[question.id] ?? "").trim() : "";

  useEffect(() => {
    if (!question) return;
    console.info("[VOICE DEBUG] Interview question shown", {
      selectedLanguage: language,
      speechLocale: getSpeechLocale(),
      questionId: question.id,
      localizedPromptAvailable: hasLocalizedQuestionPrompt(language, question.id),
    });
  }, [question, language]);

  if (!question) return null;

  const progress = Math.round(((index + 1) / visible.length) * 100);

  const persistAnswer = (questionId: string, responseText: string, responseType: string) => {
    if (!patientId) return;
    api.interview
      .saveResponse({
        patientId,
        sessionId,
        careMode: careMode ?? "allopathy",
        questionId,
        responseText,
        responseType,
      })
      .then((res) => {
        // Backend reuses the open session; adopt the id it confirms.
        if (res?.sessionId && res.sessionId !== sessionId) setSessionId(res.sessionId);
      })
      .catch((error) => {
        console.error("Failed to persist interview answer", { questionId, error });
      });
  };

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
    // Persist EVERY tap to Supabase (upsert: one current row per
    // session + question), not just React state.
    persistAnswer(question.id, JSON.stringify(next), "option");

    if (option?.redFlag) {
      const localizedOption = localizedQuestion?.options.find((o) => o.id === option.id);
      raiseRedFlag({
        label: t("possibleEmergency"),
        detail: t("redFlagDetail")
          .replace("{question}", localizedQuestion?.prompt ?? question.prompt)
          .replace("{answer}", localizedOption?.label ?? option.label),
        at: new Date().toISOString(),
      });
      return;
    }
    if (!question.multi) window.setTimeout(goNext, 350);
  };

  const handleVoiceResolved = (optionId: string | null, transcript: string) => {
    if (optionId) {
      choose(optionId);
      return;
    }
    const text = transcript.trim();
    if (!text) return;
    voiceAnswer(question.id, text);
    // Free-form voice: the actual transcript is stored verbatim with
    // response_type voice. NEVER replaced with the first option.
    persistAnswer(question.id, text, "voice");
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
      {sessionError ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border-2 border-destructive/40 bg-destructive-soft p-5 text-lg font-bold text-destructive"
        >
          {sessionError}
        </div>
      ) : null}
      <div className="mb-6">
        <div className="flex items-center justify-between text-lg font-semibold text-muted-foreground">
          <span>
            {t("question")} {index + 1} {t("of")} {visible.length}
          </span>
          <span className="rounded-full bg-accent px-4 py-1 text-primary">
            {localizedQuestion?.section}
          </span>
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
            {localizedQuestion?.prompt}
          </h1>
          {localizedQuestion?.hint ? (
            <p className="mt-2 text-xl text-muted-foreground">{localizedQuestion.hint}</p>
          ) : null}
        </div>
        <ListenButton
          key={question.id}
          text={`${localizedQuestion?.prompt}. ${localizedQuestion?.hint ?? ""}`}
          autoPlay
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {voiceAnswerText && selected.length === 0 ? (
            <div className="flex items-start gap-4 rounded-3xl border-2 border-primary bg-primary-soft p-5 shadow-card sm:col-span-2">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Mic className="size-7" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold text-primary">
                  {t("voiceAnswerRecognized")}
                </span>
                <span className="block text-xl italic text-foreground">“{voiceAnswerText}”</span>
              </span>
            </div>
          ) : null}
          {localizedQuestion?.options.map((o) => {
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
          prompt={localizedQuestion?.prompt ?? question.prompt}
          matches={localizedQuestion?.options.map((o) => ({ id: o.id, label: o.label })) ?? []}
          onResolved={handleVoiceResolved}
        />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => (index === 0 ? navigate({ to: "/dashboard" }) : setIndex((i) => i - 1))}
          className="inline-flex min-h-16 items-center gap-2 rounded-full border-2 border-border bg-card px-8 text-xl font-bold"
        >
          <ArrowLeft className="size-6" /> {t("back")}
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={selected.length === 0 && voiceAnswerText === ""}
          className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-2xl font-extrabold text-primary-foreground shadow-lift transition-opacity disabled:opacity-40"
        >
          {index + 1 >= visible.length ? t("finishQuestions") : t("next")}{" "}
          <ArrowRight className="size-7" />
        </button>
      </div>
    </KioskShell>
  );
}
