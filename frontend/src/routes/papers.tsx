import React, { useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  FileHeart,
  FlaskConical,
  Hospital,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ScanLine,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { DocumentCard } from "@/components/kiosk/DocumentCard";
import type { DocKind, ExtractedDoc } from "@/lib/kiosk-data";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api, type Medicine } from "@/lib/api";
import type { TranslationKey } from "@/lib/i18n";

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

const ALLOWED_FILE_TYPES = /^image\/(jpeg|png|gif|bmp|x-ms-bmp|tiff|tif)$/;

type AnalyzedMedicine = Medicine & { writtenName?: string; purpose?: string };

type OcrErrorCode =
  | "NO_TEXT"
  | "INVALID_FILE"
  | "FILE_TOO_LARGE"
  | "RATE_LIMITED"
  | "OCR_TIMEOUT"
  | "OCR_SERVICE_UNAVAILABLE";

function ocrErrorMessage(t: (key: TranslationKey) => string, code?: string): string {
  switch (code as OcrErrorCode | undefined) {
    case "NO_TEXT":
    case "INVALID_FILE":
      return t("ocrNoText");
    case "FILE_TOO_LARGE":
      return t("ocrTooLarge");
    case "RATE_LIMITED":
      return t("ocrRateLimited");
    default:
      return t("ocrUnavailable");
  }
}

function PapersPage() {
  const { addDocument, documents, patient } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const stages = [t("capturing"), t("readingAi"), t("storing")];

  const [stage, setStage] = useState<number | null>(null);
  const [latest, setLatest] = useState<ExtractedDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeKind, setActiveKind] = useState<DocKind | null>(null);

  const startScan = (kind: DocKind) => {
    setActiveKind(kind);
    setError(null);
    fileInputRef.current?.click();
  };

  const runExtract = async (file: File) => {
    setLatest(null);
    setReviewing(false);
    setError(null);
    setStage(0);

    const stageInterval = setInterval(() => {
      setStage((prev) => (prev !== null && prev < 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const result = await api.ocr.extract(file);
      setExtractedText(result.text);
      setReviewing(true);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      console.error(err);
      setError(ocrErrorMessage(t, code));
    } finally {
      clearInterval(stageInterval);
      setStage(null);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file || !patient || !activeKind) return;

    if (!ALLOWED_FILE_TYPES.test(file.type) && file.type !== "application/pdf") {
      setError(t("ocrNoText"));
      return;
    }

    setPendingFile(file);
    await runExtract(file);
  };

  const handleRetry = () => {
    if (pendingFile) void runExtract(pendingFile);
  };

  const handleClear = () => {
    setPendingFile(null);
    setExtractedText("");
    setReviewing(false);
    setLatest(null);
    setError(null);
    setStage(null);
  };

  const handleStore = async () => {
    if (!pendingFile || !patient || !activeKind) return;

    setReviewing(false);
    setStage(2);
    setError(null);

    try {
      const response = await api.documents.analyze(patient.uhid || "", pendingFile, extractedText);

      if (!response) throw new Error("Empty response");

      const selectedKind = KINDS.find((k) => k.kind === activeKind);
      const analysis = response.analysis as typeof response.analysis & {
        summary?: string;
      };

      const newDoc: ExtractedDoc = {
        id: response.documentId,
        kind: activeKind,
        kindLabel: selectedKind?.title || "Document",
        title: selectedKind?.title || "Medical Scan",
        facility: "Kiosk Scan",
        date: new Date().toLocaleDateString(),
        diagnoses: [analysis.summary || "Extracted from scan"],
        medications: response.analysis.medicines.map((m) => {
          const med = m as AnalyzedMedicine;
          return {
            name: med.writtenName || med.medicineName || med.genericName || "Unknown",
            dose: med.strength || med.dosage || "",
            schedule: [med.frequency, med.purpose].filter(Boolean).join(" ").trim(),
            duration: med.duration || "As prescribed",
          };
        }),
      };

      addDocument(activeKind);
      setLatest(newDoc);
    } catch (err) {
      console.error(err);
      setStage(null);
      setError(ocrErrorMessage(t, (err as { code?: string })?.code));
      setReviewing(true);
    } finally {
      setStage(null);
    }
  };

  return (
    <KioskShell step="papers">
      <input
        type="file"
        accept="image/*,application/pdf"
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
      ) : reviewing ? (
        <div className="animate-rise">
          <div className="rounded-4xl border-2 border-border bg-card p-6 shadow-card sm:p-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <h2 className="text-3xl leading-tight">{t("ocrReviewTitle")}</h2>
                <p className="mt-2 text-lg text-muted-foreground">{t("ocrReviewSubtitle")}</p>
              </div>
              <ListenButton
                text={`${t("ocrReviewSubtitle")} ${extractedText}`}
                label={t("listen")}
              />
            </div>

            <label className="mt-6 block text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {t("ocrTextLabel")}
            </label>
            <textarea
              value={extractedText}
              onChange={(event) => setExtractedText(event.target.value)}
              rows={12}
              className="mt-2 w-full resize-y rounded-2xl border-2 border-border bg-background p-4 text-lg font-medium leading-relaxed outline-none focus:border-primary"
            />

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex min-h-14 items-center gap-2 rounded-full border-2 border-border bg-card px-6 text-lg font-bold"
                >
                  <Trash2 className="size-5" /> {t("clearDocument")}
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex min-h-14 items-center gap-2 rounded-full border-2 border-border bg-card px-6 text-lg font-bold"
                >
                  <RotateCcw className="size-5" /> {t("retryOcr")}
                </button>
              </div>
              <button
                type="button"
                onClick={handleStore}
                className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground shadow-lift"
              >
                {t("looksCorrect")} <ArrowRight className="size-7" />
              </button>
            </div>
          </div>
        </div>
      ) : latest ? (
        <div className="animate-rise">
          <DocumentCard doc={latest} />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleClear}
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

          <button
            type="button"
            onClick={() => navigate({ to: "/ocr-lab" })}
            className="mt-4 flex min-h-20 w-full items-center gap-4 rounded-3xl border-2 border-dashed border-primary/50 bg-primary-soft/50 p-5 text-left shadow-card"
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <ScanLine className="size-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xl font-extrabold leading-tight">
                Analyse a messy or handwritten prescription
              </span>
              <span className="block text-lg text-muted-foreground">
                Tesseract.js OCR + Gemini AI — experimental document lab
              </span>
            </span>
            <ArrowRight className="size-7 shrink-0 text-muted-foreground" />
          </button>

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
