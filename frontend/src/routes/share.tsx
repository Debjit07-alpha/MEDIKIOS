import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Building2, IdCard, Ban, Loader2 } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";
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

  const generateDoctorSummary = async (shareScope: "abha" | "hospital") => {
    const mode = careMode ?? "allopathy";
    const doctorSummaryRows = buildEnglishSummaryRows(mode, answers);
    const patientSummaryRows = buildSummary(
      mode,
      answers,
      translate(language, "notAnswered"),
      language,
    );

    try {
      await withTimeout(
        api.summary.generateDoctor({
          patientId: patient?.uhid || `demo-${Date.now()}`,
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
    } catch (err) {
      console.warn("Doctor summary generation failed, proceeding anyway:", err);
    }
  };

  const finish = async (share: boolean) => {
    setGenerating(true);
    confirmSummary();
    if (share) markShared();

    const scope = shared || share ? "abha" : "hospital";
    await generateDoctorSummary(scope);

    navigate({ to: "/done" });
  };

  return (
    <KioskShell step="share">
      <PageHeading title={t("shareTitle")} subtitle={t("shareSubtitle")} />
      <ListenButton text={t("shareConsent")} label={t("consentPlay")} autoPlay />

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
