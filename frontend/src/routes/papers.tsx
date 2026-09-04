import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  FileHeart,
  FlaskConical,
  Hospital,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ScanLine,
} from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { DocumentCard } from "@/components/kiosk/DocumentCard";
import type { DocKind, ExtractedDoc } from "@/lib/kiosk-data";
import { useKiosk } from "@/lib/kiosk-store";

export const Route = createFileRoute("/papers")({
  head: () => ({
    meta: [
      { title: "Scan your hospital papers — MediKiosk" },
      { name: "description", content: "Scan prescriptions, lab reports and discharge summaries. MediKiosk reads diagnoses, medicines, dosages and abnormal values for the doctor." },
      { property: "og:title", content: "Scan your hospital papers — MediKiosk" },
      { property: "og:description", content: "OCR and AI extraction turns paper records into structured clinical data in seconds." },
    ],
  }),
  component: PapersPage,
});

const KINDS: { kind: DocKind; icon: typeof FileHeart; title: string; sub: string }[] = [
  { kind: "prescription", icon: FileHeart, title: "Doctor's prescription", sub: "Slip with medicine names" },
  { kind: "lab", icon: FlaskConical, title: "Laboratory report", sub: "Blood, urine or sugar test" },
  { kind: "discharge", icon: Hospital, title: "Discharge paper", sub: "Given when you left the ward" },
];

const STAGES = ["Capturing the paper…", "Reading the text (OCR)…", "Finding medicines and values…"];

function PapersPage() {
  const { addDocument, documents } = useKiosk();
  const navigate = useNavigate();
  const [stage, setStage] = useState<number | null>(null);
  const [latest, setLatest] = useState<ExtractedDoc | null>(null);

  const scan = (kind: DocKind) => {
    setLatest(null);
    setStage(0);
    [1, 2].forEach((s) => window.setTimeout(() => setStage(s), s * 900));
    window.setTimeout(() => {
      setLatest(addDocument(kind));
      setStage(null);
    }, 2800);
  };

  return (
    <KioskShell step="papers">
      <PageHeading
        title="Do you have hospital papers?"
        subtitle="I can read them for the doctor so you do not have to explain everything."
        listenText="Do you have hospital papers? Touch the type of paper and place it on the scanner below the screen."
      />

      {stage !== null ? (
        <div className="animate-rise rounded-4xl border-2 border-primary/30 bg-card p-10 text-center shadow-card">
          <span className="relative mx-auto grid size-28 place-items-center rounded-full bg-accent">
            <ScanLine className="size-14 text-primary" />
          </span>
          <p className="mt-6 text-3xl font-extrabold">{STAGES[stage]}</p>
          <p className="mt-2 text-xl text-muted-foreground">Please keep the paper flat on the scanner.</p>
          <Loader2 className="mx-auto mt-6 size-10 animate-spin text-primary" />
          <div className="mx-auto mt-6 h-3 max-w-md overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
            />
          </div>
        </div>
      ) : latest ? (
        <div className="animate-rise">
          <DocumentCard doc={latest} />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setLatest(null)}
              className="inline-flex min-h-16 items-center gap-2 rounded-full border-2 border-border bg-card px-8 text-xl font-bold"
            >
              <ArrowLeft className="size-6" /> Scan another paper
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/timeline" })}
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground shadow-lift"
            >
              Looks correct, continue <ArrowRight className="size-7" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                onClick={() => scan(k.kind)}
                className="flex min-h-32 items-center gap-4 rounded-3xl border-2 border-border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]"
              >
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                  <k.icon className="size-8" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-2xl font-extrabold leading-tight">{k.title}</span>
                  <span className="block text-lg text-muted-foreground">{k.sub}</span>
                </span>
                <ArrowRight className="size-7 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>

          {documents.length ? (
            <div className="mt-8 rounded-3xl border border-border bg-card p-5">
              <p className="text-xl font-extrabold">
                {documents.length} paper(s) already read for this visit
              </p>
              <p className="text-lg text-muted-foreground">
                {documents.map((d) => `${d.kindLabel} (${d.date})`).join(" · ")}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <ListenButton text="If you do not have any paper, touch I have no papers." label="Listen" />
            <button
              type="button"
              onClick={() => navigate({ to: "/timeline" })}
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground shadow-lift"
            >
              {documents.length ? "Continue" : "I have no papers"} <ArrowRight className="size-7" />
            </button>
          </div>

          <p className="mt-6 flex items-center gap-2 text-lg text-muted-foreground">
            <AlertTriangle className="size-5 shrink-0 text-warning" />
            Abnormal values found in your reports are highlighted for the doctor.
          </p>
        </>
      )}
    </KioskShell>
  );
}
