import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Printer, DoorOpen, Loader2 } from "lucide-react";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { DoctorSummaryView } from "@/components/kiosk/DoctorSummaryView";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";

type DoctorSummaryContent = {
  patientLanguage?: string;
  careMode?: string;
  patient?: {
    name: string;
    age: number;
    sex: string;
    uhid: string;
  } | null;
  sections: { title: string; items: { label: string; value: string; verbatim?: boolean }[] }[];
  text?: string;
  generatedBy?: string;
};

export const Route = createFileRoute("/done")({
  head: () => ({
    meta: [
      { title: "All done — MediKiosk" },
      {
        name: "description",
        content:
          "Your history is with the doctor. Collect your slip and wait for your name to be called.",
      },
      { property: "og:title", content: "All done — MediKiosk" },
      {
        property: "og:description",
        content: "Intake complete — the doctor already has the patient's structured history.",
      },
    ],
  }),
  component: DonePage,
});

function DonePage() {
  const { patient, shared, summaryConfirmed, reset } = useKiosk();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const message = `${t("doneThankYou")} ${patient?.name.split(" ")[0] ?? ""}. ${t("doneMessage")}`;

  const [doctorSummary, setDoctorSummary] = useState<DoctorSummaryContent | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    if (!summaryConfirmed || !patient?.uhid) return;

    let cancelled = false;

    const fetchSummary = async () => {
      setLoadingSummary(true);
      try {
        const result = await api.summary.getDoctor(patient.uhid);
        if (!cancelled && result.success && result.doctorSummary?.content) {
          setDoctorSummary(result.doctorSummary.content as DoctorSummaryContent);
        }
      } catch (err) {
        console.warn("Failed to fetch doctor summary:", err);
        if (!cancelled) setSummaryError(true);
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [summaryConfirmed, patient?.uhid]);

  return (
    <KioskShell showSteps={false}>
      <div className="animate-rise mx-auto max-w-3xl rounded-4xl border-2 border-success bg-card p-10 text-center shadow-lift">
        <CheckCircle2 className="mx-auto size-24 text-success" />
        <h1 className="mt-6 text-5xl">{t("doneThankYou")}</h1>
        <p className="mt-4 text-2xl text-muted-foreground">{t("doneMessage")}</p>

        <div className="mt-6 rounded-3xl bg-accent p-5">
          <p className="text-xl font-bold text-accent-foreground">
            Token A-04 · {shared ? t("sharedAbha") : t("sharedHospital")}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <ListenButton text={message} label={t("listenAgain")} autoPlay />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-16 items-center gap-2 rounded-full border-2 border-border bg-card px-8 text-xl font-bold"
          >
            <Printer className="size-6" /> {t("printSlip")}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              navigate({ to: "/" });
            }}
            className="inline-flex min-h-16 items-center gap-2 rounded-full bg-primary px-8 text-xl font-extrabold text-primary-foreground"
          >
            <DoorOpen className="size-6" /> {t("finishNext")}
          </button>
        </div>
      </div>

      {shared && (
        <div className="mx-auto mt-8 max-w-4xl">
          {loadingSummary ? (
            <div className="flex flex-col items-center gap-4 rounded-4xl border-2 border-primary bg-primary-soft p-10 shadow-card">
              <Loader2 className="size-10 animate-spin text-primary" />
              <p className="text-xl font-bold">
                {language === "en"
                  ? "Loading doctor summary..."
                  : t("loadingDoctorSummary")}
              </p>
            </div>
          ) : doctorSummary ? (
            <DoctorSummaryView summary={doctorSummary} />
          ) : summaryError ? (
            <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card">
              <p className="text-lg text-muted-foreground">
                Doctor summary will be available shortly.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </KioskShell>
  );
}
