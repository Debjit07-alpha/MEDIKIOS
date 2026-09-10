import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Building2, IdCard, Ban, Loader2 } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";
import { canonicalPatientId } from "@/lib/patient";
import { buildEnglishSummaryRows, buildSummary } from "@/lib/buildSummary";
import { translate } from "@/lib/i18n";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Doctor summary request timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Sharing consent — MediKiosk" },
      {
        name: "description",
        content:
          "Decide whether your summary goes to the hospital system only, or also to your ABHA health record.",
      },
      { property: "og:title", content: "Sharing consent — MediKiosk" },
      {
        property: "og:description",
        content: "Explicit, spoken consent before any record leaves the hospital.",
      },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const {
    markShared,
    confirmSummary,
    patient,
    sessionId,
    careMode,
    answers,
    voiceAnswers,
    documents,
    redFlag,
    language,
    shared,
  } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const patientId = canonicalPatientId(patient);

  const generateDoctorSummary = async (shareScope: "abha" | "hospital") => {
    if (!patientId) {
      throw new Error("No registered patient for this kiosk session");
    }
    const mode = careMode ?? "allopathy";
    const doctorSummaryRows = buildEnglishSummaryRows(mode, answers);
    const patientSummaryRows = buildSummary(
      mode,
      answers,
      translate(language, "notAnswered"),
      language,
    );

    // Consultation row for the doctor queue, linked to the SAME patients.id.
    await api.consultations.create({
      patientId,
      status: shareScope === "abha" ? "shared_abha" : "shared_hospital",
    });

    const result = await withTimeout(
      api.summary.generateDoctor({
        patientId,
        patientLanguage: language,
        careMode: mode,
        patient: patient
          ? { name: patient.name, age: patient.age, sex: patient.sex, uhid: patient.uhid }
          : null,
        answers,
        voiceAnswers,
        documents: documents as unknown[],
        redFlag,
        doctorSummaryRows,
        patientSummaryRows,
        shareScope,
      }),
      15000,
    );

    // Close the interview session best-effort; the summary is already stored.
    if (sessionId) {
      await api.interview.completeSession(sessionId).catch((err) => {
        console.warn("Failed to complete interview session:", err);
      });
    }

    return result;
  };

  const finish = async (share: boolean) => {
    setGenerating(true);
    setShareError(null);

    const scope = shared || share ? "abha" : "hospital";
    try {
      await generateDoctorSummary(scope);
    } catch (err) {
      console.error("Doctor summary generation failed:", err);
      setShareError(
        "Could not save the clinical summary. Please check the connection and try again.",
      );
      setGenerating(false);
      return;
    }

    confirmSummary();
    if (share) markShared();

    navigate({ to: "/done" });
  };

  return (
    <KioskShell step="share">
      <PageHeading title={t("shareTitle")} subtitle={t("shareSubtitle")} />
      <ListenButton text={t("shareConsent")} label={t("consentPlay")} autoPlay />

      {!patientId ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border-2 border-destructive/40 bg-destructive-soft p-5 text-lg font-bold text-destructive"
        >
          No registered patient for this kiosk session. Please complete identity first.
        </div>
      ) : null}
      {shareError ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border-2 border-destructive/40 bg-destructive-soft p-5 text-lg font-bold text-destructive"
        >
          {shareError}
        </div>
      ) : null}

      {generating ? (
        <div className="mt-6 flex flex-col items-center gap-4 rounded-4xl border-2 border-primary bg-primary-soft p-10 shadow-card">
          <Loader2 className="size-12 animate-spin text-primary" />
          <p className="text-xl font-bold text-primary">
            {language === "en" ? "Generating doctor summary..." : t("generatingSummary")}
          </p>
          <p className="text-muted-foreground">
            {language === "en"
              ? "Please wait while we prepare your clinical summary for the doctor."
              : t("generatingSummarySub")}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => finish(true)}
            className="flex min-h-64 flex-col justify-between rounded-4xl border-2 border-primary bg-primary-soft p-7 text-left shadow-card transition-transform hover:-translate-y-1 active:scale-[0.99]"
          >
            <IdCard className="size-12 text-primary" />
            <div>
              <p className="text-3xl font-extrabold leading-tight">{t("doctorAndAbha")}</p>
              <p className="mt-2 text-lg text-muted-foreground">{t("doctorAndAbhaSub")}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => finish(false)}
            className="flex min-h-64 flex-col justify-between rounded-4xl border-2 border-border bg-card p-7 text-left shadow-card transition-transform hover:-translate-y-1 active:scale-[0.99]"
          >
            <Building2 className="size-12 text-primary" />
            <div>
              <p className="text-3xl font-extrabold leading-tight">{t("onlyHospital")}</p>
              <p className="mt-2 text-lg text-muted-foreground">{t("onlyHospitalSub")}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => finish(false)}
            className="flex min-h-64 flex-col justify-between rounded-4xl border-2 border-border bg-card p-7 text-left shadow-card transition-transform hover:-translate-y-1 active:scale-[0.99]"
          >
            <Ban className="size-12 text-muted-foreground" />
            <div>
              <p className="text-3xl font-extrabold leading-tight">{t("doNotShare")}</p>
              <p className="mt-2 text-lg text-muted-foreground">{t("doNotShareSub")}</p>
            </div>
          </button>
        </div>
      )}

      <p className="mt-8 flex items-center gap-3 text-lg text-muted-foreground">
        <ShieldCheck className="size-6 shrink-0 text-success" />
        {t("withdrawPermission")}
      </p>
    </KioskShell>
  );
}
