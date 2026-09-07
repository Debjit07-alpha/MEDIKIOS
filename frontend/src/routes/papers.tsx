import React, { useState, useRef } from "react";
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
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/papers")({
  component: PapersPage,
});

const KINDS: { kind: DocKind; icon: typeof FileHeart; title: string; sub: string }[] = [
  {
    kind: "prescription",
    icon: FileHeart,
    title: "Doctor's prescription",
    sub: "Slip with medicine names",
  },
  {
    kind: "lab",
    icon: FlaskConical,
    title: "Laboratory report",
    sub: "Blood, urine or sugar test",
  },
  {
    kind: "discharge",
    icon: Hospital,
    title: "Discharge paper",
    sub: "Given when you left the ward",
  },
];

const STAGES = ["Capturing the paper...", "Reading text with AI...", "Storing your record..."];

function PapersPage() {
  const { addDocument, documents, patient } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const stages = [t("capturing"), t("readingAi"), t("storing")];

  const [stage, setStage] = useState<number | null>(null);
  const [latest, setLatest] = useState<ExtractedDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeKind, setActiveKind] = useState<DocKind | null>(null);

  const startScan = (kind: DocKind) => {
    setActiveKind(kind);
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !patient || !activeKind) return;

    try {
      setLatest(null);
      setStage(0);

      const stageInterval = setInterval(() => {
        setStage((prev) => (prev !== null && prev < 2 ? prev + 1 : prev));
      }, 1500);

      const response = await api.documents.analyze(patient.uhid, file);

      clearInterval(stageInterval);
      setStage(null);

      if (response && response.success) {
        const selectedKind = KINDS.find((k) => k.kind === activeKind);

        // --- FIXING OBJECT LITERAL ERRORS HERE ---
        const newDoc: ExtractedDoc = {
          id: response.documentId,
          kind: activeKind,
          kindLabel: selectedKind?.title || "Document",
          title: selectedKind?.title || "Medical Scan",
          facility: "Kiosk Scan",
          date: new Date().toLocaleDateString(),
          // Use 'diagnoses' array instead of 'diagnosis' string
          diagnoses: [response.analysis.summary || "Extracted from scan"],
          // Rename 'medicines' to 'medications' and map keys to: name, dose, schedule, duration
          medications: response.analysis.medicines.map((m) => ({
            name: m.writtenName,
            dose: m.strength || m.dosage || "",
            schedule: `${m.frequency || ""} ${m.purpose ? `(${m.purpose})` : ""}`,
            duration: "As prescribed",
          })),
        };

        addDocument(activeKind);
        setLatest(newDoc);
      }
    } catch (err) {
      setStage(null);
      setError(t("documentError"));
      console.error(err);
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  return (
    <KioskShell step="papers">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <PageHeading title={t("papersTitle")} subtitle={t("papersSubtitle")} />

      {error && (
        <div className="mb-6 rounded-xl bg-destructive/10 p-4 text-center text-destructive font-bold">
          {error}
        </div>
      )}

      {stage !== null ? (
        <div className="animate-rise rounded-4xl border-2 border-primary/30 bg-card p-10 text-center shadow-card">
          <span className="relative mx-auto grid size-28 place-items-center rounded-full bg-accent">
            <ScanLine className="size-14 text-primary" />
          </span>
          <p className="mt-6 text-3xl font-extrabold">{stages[stage]}</p>
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
              <ArrowLeft className="size-6" /> {t("scanAnother")}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/timeline" })}
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground shadow-lift"
            >
              {t("looksCorrect")} <ArrowRight className="size-7" />
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
                onClick={() => startScan(k.kind)}
                className="flex min-h-32 items-center gap-4 rounded-3xl border-2 border-border bg-card p-5 text-left shadow-card"
              >
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                  <k.icon className="size-8" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-2xl font-extrabold leading-tight">
                    {k.kind === "prescription"
                      ? t("prescription")
                      : k.kind === "lab"
                        ? t("labReport")
                        : t("dischargePaper")}
                  </span>
                  <span className="block text-lg text-muted-foreground">
                    {k.kind === "prescription"
                      ? t("prescriptionSub")
                      : k.kind === "lab"
                        ? t("labReportSub")
                        : t("dischargePaperSub")}
                  </span>
                </span>
                <ArrowRight className="size-7 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <ListenButton text={t("paperListen")} label={t("listen")} />
            <button
              type="button"
              onClick={() => navigate({ to: "/timeline" })}
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground shadow-lift"
            >
              {documents.length ? t("continue") : t("noPapers")} <ArrowRight className="size-7" />
            </button>
          </div>
        </>
      )}
    </KioskShell>
  );
}
