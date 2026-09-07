import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Pill, FlaskConical, Hospital, Stethoscope } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import type { ExtractedDoc } from "@/lib/kiosk-data";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Your health timeline — MediKiosk" },
      {
        name: "description",
        content:
          "Every scanned prescription, lab report and discharge summary placed in date order for the doctor.",
      },
      { property: "og:title", content: "Your health timeline — MediKiosk" },
      {
        property: "og:description",
        content: "A chronological medical history built automatically from your own papers.",
      },
    ],
  }),
  component: TimelinePage,
});

const BASE = [
  {
    id: "base-1",
    date: "2025-11-27",
    kind: "discharge" as const,
    title: "Admitted for pneumonia, discharged after 5 days",
    facility: "District General Hospital, Ward 4",
  },
  {
    id: "base-2",
    date: "2026-02-14",
    kind: "visit" as const,
    title: "OPD review — sugar control advised",
    facility: "Medicine OPD",
  },
];

const ICONS = {
  prescription: Pill,
  lab: FlaskConical,
  discharge: Hospital,
  visit: Stethoscope,
};

type TimelineKind = keyof typeof ICONS;
type TimelineEntry = {
  id: string;
  date: string;
  kind: TimelineKind;
  title: string;
  facility: string;
};

function TimelinePage() {
  const { documents } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const entries: TimelineEntry[] = [
    ...BASE.map((entry) => ({
      ...entry,
      title: entry.id === "base-1" ? t("timelineDischarge") : t("timelineVisit"),
      facility: entry.id === "base-1" ? t("timelineDischargeFacility") : t("timelineVisitFacility"),
    })),
    ...documents.map((d: ExtractedDoc) => ({
      id: d.id,
      date: d.date,
      kind: d.kind as TimelineKind,
      title: `${d.kindLabel}: ${d.diagnoses.join(", ") || d.title}`,
      facility: d.facility,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <KioskShell step="timeline">
      <PageHeading
        title={t("timelineTitle")}
        subtitle={t("timelineSubtitle")}
        listenText={t("timelineListen")}
      />

      <ol className="relative ml-4 border-l-4 border-accent pl-8">
        {entries.map((e) => {
          const Icon = ICONS[e.kind];
          return (
            <li key={e.id} className="animate-rise relative pb-8 last:pb-0">
              <span className="absolute -left-13 grid size-12 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground">
                <Icon className="size-6" />
              </span>
              <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
                <p className="flex items-center gap-2 text-lg font-bold text-primary">
                  <CalendarClock className="size-5" /> {e.date}
                </p>
                <p className="mt-1 text-2xl font-extrabold leading-tight">{e.title}</p>
                <p className="text-lg text-muted-foreground">{e.facility}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={() => navigate({ to: "/summary" })}
          className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-2xl font-extrabold text-primary-foreground shadow-lift"
        >
          {t("timelineSummary")} <ArrowRight className="size-7" />
        </button>
      </div>
    </KioskShell>
  );
}
