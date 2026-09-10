import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { MessageSquareHeart, FileScan, CalendarClock, FileText, ShieldCheck } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { canonicalPatientId } from "@/lib/patient";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your kiosk dashboard — MediKiosk" },
      {
        name: "description",
        content:
          "Answer questions, scan papers, see your health timeline and check the summary before meeting the doctor.",
      },
      { property: "og:title", content: "Your kiosk dashboard — MediKiosk" },
      {
        property: "og:description",
        content: "Four large tiles guide the patient through the whole intake with audio help.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { patient, careMode, documents, hydrated } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const patientId = canonicalPatientId(patient);

  // Patient-specific step: no active patient context → back to identification.
  // Wait for the persisted session to restore first so a refresh keeps the patient.
  useEffect(() => {
    if (hydrated && !patientId) navigate({ to: "/identity" });
  }, [hydrated, patientId, navigate]);

  if (!hydrated || !patientId) return null;

  const firstName = patient?.name.split(" ")[0] ?? "friend";

  const tiles = [
    {
      to: "/interview" as const,
      icon: MessageSquareHeart,
      title: t("stepQuestions"),
      text: t("voiceHint"),
      primary: true,
    },
    {
      to: "/papers" as const,
      icon: FileScan,
      title: t("papersTitle"),
      text: documents.length
        ? `${documents.length} paper(s) read`
        : `${t("prescription")}, ${t("labReport")}, ${t("dischargePaper")}`,
    },
    {
      to: "/timeline" as const,
      icon: CalendarClock,
      title: t("timelineTitle"),
      text: t("timelineSubtitle"),
    },
    {
      to: "/summary" as const,
      icon: FileText,
      title: t("stepSummary"),
      text: t("summarySubtitle"),
    },
  ];

  return (
    <KioskShell step="start">
      <PageHeading
        title={`${t("greetingNamaste")} ${firstName}`}
        subtitle={t("careSubtitle")}
        listenText={`${t("stepQuestions")}. ${t("papersTitle")}`}
      />

      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border border-primary/20 bg-accent p-5">
        <div className="flex min-w-0 items-center gap-3">
          <ShieldCheck className="size-8 shrink-0 text-primary" />
          <p className="truncate text-xl font-bold">
            {t("careTitle")}: {careMode === "ayush" ? t("careModeAyush") : t("careModeAllopathy")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/care" })}
          className="min-h-12 rounded-full bg-card px-6 text-lg font-bold shadow-card"
        >
          {t("back")}
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "animate-rise flex min-h-44 flex-col justify-between rounded-4xl border-2 p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift",
              t.primary
                ? "border-success bg-success text-success-foreground"
                : "border-border bg-card",
            )}
          >
            <t.icon className="size-10" />
            <div>
              <p className="text-3xl font-extrabold leading-tight">{t.title}</p>
              <p className={cn("mt-1 text-lg", t.primary ? "opacity-90" : "text-muted-foreground")}>
                {t.text}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </KioskShell>
  );
}
