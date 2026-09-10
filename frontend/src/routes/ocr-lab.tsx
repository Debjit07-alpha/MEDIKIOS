import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileHeart,
  FlaskConical,
  Hospital,
  ListChecks,
  Loader2,
  Maximize2,
  Minimize2,
  Pill,
  RotateCcw,
  Save,
  ScanSearch,
  Search,
  ShieldAlert,
  Stethoscope,
  Upload,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { api, type OcrAnalyzeResponse, type OcrConfidence, type OcrDocumentType } from "@/lib/api";
import { canonicalPatientId } from "@/lib/patient";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import type { DocKind } from "@/lib/kiosk-data";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ocr-lab")({
  head: () => ({
    meta: [
      { title: "Medical Document Reader — MediKiosk" },
      {
        name: "description",
        content:
          "Upload a prescription or medical document and get important information in an easy-to-read format.",
      },
    ],
  }),
  component: OcrLabPage,
});

const STAGES: TranslationKey[] = [
  "ocrStageUploading",
  "ocrStageReading",
  "ocrStageOrganizing",
  "ocrStageChecking",
  "ocrStagePreparing",
];

const ALLOWED_FILE_TYPES = /^image\/(jpeg|png|webp|bmp|x-ms-bmp|tiff|tif)$/;

type FilterKind = "all" | "medicines" | "investigations" | "procedures" | "diagnoses";

const FILTERS: { kind: FilterKind; key: TranslationKey }[] = [
  { kind: "all", key: "ocrFilterAll" },
  { kind: "medicines", key: "ocrFilterMedicines" },
  { kind: "investigations", key: "ocrFilterInvestigations" },
  { kind: "procedures", key: "ocrFilterProcedures" },
  { kind: "diagnoses", key: "ocrFilterDiagnoses" },
];

const DOC_TYPE_TO_KIND: Record<OcrDocumentType, DocKind> = {
  prescription: "prescription",
  blood_test_report: "lab",
  urine_test_report: "lab",
  glucose_or_sugar_report: "lab",
  lab_report: "lab",
  medical_report: "discharge",
  procedure_report: "discharge",
  surgical_document: "discharge",
  other_medical_document: "discharge",
  unknown: "discharge",
};

function makeSaveKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ConfidenceBadge({ level }: { level: OcrConfidence }) {
  const { t } = useLanguage();
  if (level === "high") return null;
  const medium = level === "medium";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
        medium && "bg-warning-soft text-warning-foreground",
        !medium && "bg-destructive-soft text-destructive",
      )}
      aria-label={t(medium ? "ocrPleaseCheck" : "ocrNeedsReview")}
    >
      {medium ? (
        <ShieldAlert className="size-4" aria-hidden />
      ) : (
        <AlertTriangle className="size-4" aria-hidden />
      )}
      {t(medium ? "ocrPleaseCheck" : "ocrNeedsReview")}
    </span>
  );
}

function Evidence({ evidence }: { evidence: string }) {
  const { t } = useLanguage();
  if (!evidence) return null;
  return (
    <details className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
      <summary className="cursor-pointer text-sm font-bold text-muted-foreground">
        {t("ocrEvidence")}
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-base">{evidence}</p>
    </details>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      <dt className="min-w-32.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}

function MedicineCard({
  medicine,
}: {
  medicine: NonNullable<OcrAnalyzeResponse["analysis"]>["medicines"][number];
}) {
  const { t } = useLanguage();
  return (
    <article className="rounded-3xl border-2 border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-2xl font-extrabold">
          <Pill className="size-6 shrink-0 text-primary" aria-hidden />
          {medicine.name}
        </h3>
        <ConfidenceBadge level={medicine.confidence} />
      </div>
      {medicine.strength ? (
        <p className="mt-2 text-xl font-bold text-muted-foreground">{medicine.strength}</p>
      ) : null}
      <dl className="mt-4 grid gap-3">
        <DetailRow label={t("ocrDosage")} value={medicine.dosage} />
        <DetailRow label={t("ocrFrequency")} value={medicine.frequency} />
        <DetailRow label={t("ocrRoute")} value={medicine.route} />
        <DetailRow label={t("ocrDuration")} value={medicine.duration} />
        <DetailRow label={t("ocrInstructions")} value={medicine.instructions} />
      </dl>
      <Evidence evidence={medicine.evidence} />
    </article>
  );
}

function InvestigationCard({
  investigation,
}: {
  investigation: NonNullable<OcrAnalyzeResponse["analysis"]>["investigations"][number];
}) {
  const { t } = useLanguage();
  return (
    <article className="rounded-3xl border-2 border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-2xl font-extrabold">
          <FlaskConical className="size-6 shrink-0 text-primary" aria-hidden />
          {investigation.test}
        </h3>
        <ConfidenceBadge level={investigation.confidence} />
      </div>
      <dl className="mt-4 grid gap-3">
        {investigation.value ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <dt className="min-w-32.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("ocrResult")}
            </dt>
            <dd className="text-2xl font-extrabold text-primary">
              {investigation.value}
              {investigation.unit ? (
                <span className="ml-1 text-lg font-semibold text-muted-foreground">
                  {investigation.unit}
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
        {investigation.flag ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <dt className="min-w-32.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("ocrOutOfRange")}
            </dt>
            <dd>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive-soft px-3 py-1 text-sm font-bold text-destructive">
                <AlertTriangle className="size-4" aria-hidden />
                {investigation.flag}
              </span>
            </dd>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <dt className="min-w-32.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {t("ocrReferenceRange")}
          </dt>
          <dd className="text-lg font-semibold">
            {investigation.referenceRange ?? t("ocrNotProvided")}
          </dd>
        </div>
        <DetailRow label={t("ocrDate")} value={investigation.date} />
      </dl>
      <Evidence evidence={investigation.evidence} />
    </article>
  );
}

function ProcedureCard({
  procedure,
}: {
  procedure: NonNullable<OcrAnalyzeResponse["analysis"]>["procedures"][number];
}) {
  const { t } = useLanguage();
  return (
    <article className="rounded-3xl border-2 border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-2xl font-extrabold">
          <Hospital className="size-6 shrink-0 text-primary" aria-hidden />
          {procedure.name}
        </h3>
        <ConfidenceBadge level={procedure.confidence} />
      </div>
      <dl className="mt-4 grid gap-3">
        <DetailRow label={t("ocrDetails")} value={procedure.details} />
        <DetailRow label={t("ocrDate")} value={procedure.date} />
      </dl>
      <Evidence evidence={procedure.evidence} />
    </article>
  );
}

function itemMatches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => typeof field === "string" && field.toLowerCase().includes(q));
}

function OcrLabPage() {
  const navigate = useNavigate();
  const { patient, sessionId, addDocument } = useKiosk();
  const patientId = canonicalPatientId(patient);
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const [result, setResult] = useState<OcrAnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [zoom, setZoom] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryState, setRetryState] = useState<"idle" | "retrying" | "failed">("idle");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    };
  }, [previewUrl]);

  const pickFile = () => fileInputRef.current?.click();

  const runAnalysis = async (selected: File) => {
    setFile(selected);
    setResult(null);
    setError(null);
    setSaveError(null);
    setSaveState("idle");
    setRetryState("idle");
    saveKeyRef.current = null;
    setQuery("");
    setFilter("all");
    setStage(0);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));

    if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    stageTimerRef.current = setInterval(() => {
      setStage((prev) => (prev !== null && prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 1400);

    try {
      const response = await api.ocr.analyzeDocument(selected);
      setResult(response);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      console.error(err);
      setError(ocrMessageFor(code, t));
    } finally {
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
      setStage(null);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!selected) return;
    if (!ALLOWED_FILE_TYPES.test(selected.type)) {
      setError(t("ocrErrUnsupported"));
      return;
    }
    await runAnalysis(selected);
  };

  // Gemini-only retry: Tesseract already succeeded, so the extracted
  // text and the original image are sent straight to the analysis stage.
  // Manual and single-shot — never automatic, never a loop.
  const retryDetailedAnalysis = async () => {
    const rawText = result?.ocr?.rawText?.trim() || "";
    if (!file || !rawText || retryState === "retrying") return;
    setRetryState("retrying");
    try {
      const response = await api.ocr.retryAnalysis(file, rawText);
      setResult(response);
      setRetryState("idle");
    } catch (err) {
      console.error("Detailed analysis retry failed:", err);
      setRetryState("failed");
    }
  };

  const handleSave = async () => {
    const rawText = result?.ocr?.rawText || result?.analysis?.rawOcrText || "";
    if (!file || !result || !rawText.trim()) return;
    if (saveState === "saving" || saveState === "saved") return;

    if (!patientId) {
      setSaveError(t("ocrSaveNeedsPatient"));
      setSaveState("failed");
      return;
    }

    saveKeyRef.current ??= makeSaveKey();
    setSaveError(null);
    setSaveState("saving");

    // OCR-only save when Gemini was unavailable: document + raw OCR text
    // are stored with analysis null. Nothing is invented.
    const documentType = result.analysis?.documentType ?? "unknown";

    try {
      await api.ocr.saveDocument({
        patientId,
        sessionId,
        file,
        saveKey: saveKeyRef.current,
        documentType,
        rawOcrText: rawText,
        analysis: result.analysis ?? null,
        analysisStatus:
          result.analysisStatus ?? (result.analysis ? "ready" : "temporarily_unavailable"),
        warnings: result.warnings ?? [],
      });

      addDocument(DOC_TYPE_TO_KIND[documentType]);
      setSaveState("saved");

      // Navigate ONLY after the backend confirmed the save.
      void navigate({ to: "/timeline" });
    } catch (err) {
      console.error("Save failed:", err);
      setSaveState("failed");
      setSaveError(t("ocrSaveFailed"));
    }
  };

  const analysis = result?.analysis ?? null;
  const ocrText = result?.ocr?.rawText || "";
  const hasOcrText = ocrText.trim().length > 0;

  const spokenSummary = useMemo(() => {
    // When detailed organization is unavailable, read-aloud still works:
    // it reads the extracted document text instead of nothing.
    if (!analysis) return ocrText;
    const lines: string[] = [
      `This is a ${(analysis.documentType || "medical document").replace(/_/g, " ")}.`,
    ];
    if (analysis.medicines.length) {
      lines.push(`${analysis.medicines.length} medicines.`);
      for (const m of analysis.medicines.slice(0, 6)) {
        lines.push(
          `${m.name}${m.strength ? ` ${m.strength}` : ""}${m.frequency ? `, ${m.frequency}` : ""}.`,
        );
      }
    }
    if (analysis.investigations.length) {
      lines.push(`${analysis.investigations.length} investigation values.`);
    }
    if (analysis.diagnoses.length) {
      lines.push(`Documented diagnoses: ${analysis.diagnoses.map((d) => d.name).join(", ")}.`);
    }
    if (analysis.instructions.length) {
      lines.push(`Instructions: ${analysis.instructions.join(". ")}.`);
    }
    return lines.join(" ");
  }, [analysis, ocrText]);

  const medicines = useMemo(
    () =>
      (analysis?.medicines ?? []).filter((m) =>
        itemMatches(
          query,
          m.name,
          m.strength,
          m.dosage,
          m.frequency,
          m.route,
          m.duration,
          m.instructions,
        ),
      ),
    [analysis, query],
  );
  const investigations = useMemo(
    () =>
      (analysis?.investigations ?? []).filter((i) =>
        itemMatches(query, i.test, i.value, i.unit, i.referenceRange),
      ),
    [analysis, query],
  );
  const procedures = useMemo(
    () => (analysis?.procedures ?? []).filter((p) => itemMatches(query, p.name, p.details, p.date)),
    [analysis, query],
  );
  const diagnoses = useMemo(
    () =>
      (analysis?.diagnoses ?? [])
        .filter((d) => d.status === "documented")
        .filter((d) => itemMatches(query, d.name)),
    [analysis, query],
  );
  const instructions = useMemo(
    () => (analysis?.instructions ?? []).filter((text) => itemMatches(query, text)),
    [analysis, query],
  );

  const hasResults =
    medicines.length > 0 ||
    investigations.length > 0 ||
    procedures.length > 0 ||
    diagnoses.length > 0 ||
    instructions.length > 0;

  const showSection = (kind: FilterKind) => filter === "all" || filter === kind;

  const renderImage = ({ fixed }: { fixed: boolean }) => (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-border bg-muted",
        fixed ? "h-104" : "h-full",
      )}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={t("ocrOriginalDocument")}
          className={cn(
            "h-full w-full object-contain",
            zoom && fixed ? "transition-transform duration-200" : "",
          )}
          style={zoom && fixed ? { transform: `scale(${zoom})` } : undefined}
        />
      ) : null}
    </div>
  );

  return (
    <KioskShell showSteps={false}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/papers" })}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-border bg-card px-4 text-base font-bold"
          aria-label={t("ocrBackToDocs")}
        >
          <ArrowLeft className="size-5" /> {t("back")}
        </button>
        <PageHeading title={t("ocrReaderTitle")} subtitle={t("ocrReaderSubtitle")} />
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border-2 border-destructive/40 bg-destructive-soft p-5 text-destructive"
        >
          <p className="text-lg font-bold">{error}</p>
          <button
            type="button"
            onClick={() => file && void runAnalysis(file)}
            className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-base font-bold text-primary-foreground"
          >
            <RotateCcw className="size-5" /> {t("ocrTryAgain")}
          </button>
        </div>
      ) : null}

      {stage !== null ? (
        <section
          aria-live="polite"
          className="animate-rise rounded-4xl border-2 border-primary/30 bg-card p-8 shadow-card"
        >
          <h2 className="text-2xl font-extrabold">{t("ocrPreparingTitle")}</h2>
          <ol className="mt-6 grid gap-3">
            {STAGES.map((key, index) => {
              const done = index < stage;
              const activeStage = index === stage;
              return (
                <li
                  key={key}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border-2 px-5 py-3 text-lg font-semibold",
                    activeStage && "border-primary bg-primary-soft text-primary",
                    done && "border-success/40 bg-success-soft text-success",
                    !activeStage && !done && "border-border text-muted-foreground",
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="size-6 shrink-0" aria-hidden />
                  ) : activeStage ? (
                    <Loader2 className="size-6 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full border text-sm"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                  )}
                  {t(key)}
                </li>
              );
            })}
          </ol>
        </section>
      ) : result ? (
        <>
          <div className="animate-rise grid gap-6 pb-40 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            {/* Image preview */}
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-4xl border-2 border-border bg-card p-5 shadow-card">
                <h3 className="flex items-center gap-2 text-xl font-extrabold">
                  <FileHeart className="size-6 text-primary" aria-hidden />{" "}
                  {t("ocrOriginalDocument")}
                </h3>
                {renderImage({ fixed: true })}
                <div
                  className="mt-4 flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label={t("ocrOriginalDocument")}
                >
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, (z ?? 1) + 0.25))}
                    className="grid size-11 place-items-center rounded-full border-2 border-border bg-card"
                    aria-label={t("ocrZoomIn")}
                  >
                    <ZoomIn className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setZoom((z) => (z === null || z - 0.25 < 0.25 ? null : z - 0.25))
                    }
                    className="grid size-11 place-items-center rounded-full border-2 border-border bg-card"
                    aria-label={t("ocrZoomOut")}
                  >
                    <ZoomOut className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(null)}
                    className={cn(
                      "min-h-11 rounded-full border-2 px-4 text-sm font-bold",
                      zoom === null
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card",
                    )}
                  >
                    {t("ocrFit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreen(true)}
                    className="grid size-11 place-items-center rounded-full border-2 border-border bg-card"
                    aria-label={t("ocrFullscreen")}
                  >
                    <Maximize2 className="size-5" />
                  </button>
                </div>
              </div>
            </aside>

            {/* Results */}
            <main>
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border-2 border-warning/40 bg-warning-soft p-4">
                <p className="flex items-center gap-2 text-base font-bold text-warning-foreground">
                  <ShieldAlert className="size-5 shrink-0" aria-hidden />
                  {t("ocrVerifyInfo")}
                </p>
                {result.warning ? (
                  <p className="text-base font-semibold text-warning-foreground">
                    {result.warning}
                  </p>
                ) : null}
              </div>

              {!analysis && hasOcrText ? (
                <section
                  aria-label={t("ocrExtractedText")}
                  className="rounded-4xl border-2 border-border bg-card p-8 shadow-card"
                >
                  <h2 className="flex items-center gap-2 text-2xl font-extrabold">
                    <ScanSearch className="size-8 text-primary" aria-hidden />
                    {t("ocrTextExtractedTitle")}
                  </h2>
                  <p className="mt-2 text-lg text-muted-foreground">{t("ocrTextExtractedBody")}</p>
                  <div className="mt-4">
                    <ListenButton text={ocrText} label={t("ocrReadAloud")} />
                  </div>
                  <h3 className="mt-6 text-xl font-extrabold">{t("ocrExtractedText")}</h3>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-muted p-4 text-left text-base">
                    {ocrText}
                  </pre>
                  <button
                    type="button"
                    onClick={() => void retryDetailedAnalysis()}
                    disabled={retryState === "retrying"}
                    className="mt-6 inline-flex min-h-14 items-center gap-2 rounded-full bg-primary px-8 text-lg font-extrabold text-primary-foreground shadow-lift disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {retryState === "retrying" ? (
                      <>
                        <Loader2 className="size-5 animate-spin" aria-hidden />{" "}
                        {t("ocrRetryingAnalysis")}
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-5" /> {t("ocrTryDetailedAgain")}
                      </>
                    )}
                  </button>
                  {retryState === "failed" ? (
                    <p role="alert" className="mt-3 text-lg text-muted-foreground">
                      {t("ocrRetryStillUnavailable")}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {!analysis && !hasOcrText ? (
                <div className="rounded-4xl border-2 border-border bg-card p-8 text-center shadow-card">
                  <ScanSearch className="mx-auto size-14 text-primary" aria-hidden />
                  <h2 className="mt-4 text-2xl font-extrabold">{t("ocrUnavailableTitle")}</h2>
                  <p className="mt-2 text-lg text-muted-foreground">{t("ocrUnavailableText")}</p>
                  <button
                    type="button"
                    onClick={() => file && void runAnalysis(file)}
                    className="mt-6 inline-flex min-h-14 items-center gap-2 rounded-full bg-primary px-8 text-lg font-extrabold text-primary-foreground shadow-lift"
                  >
                    <RotateCcw className="size-5" /> {t("ocrTryAgain")}
                  </button>
                </div>
              ) : null}

              {analysis ? (
                <>
                  <section aria-label={t("ocrMedicalInformation")}>
                    <h2 className="flex items-center gap-2 text-3xl font-extrabold">
                      <ScanSearch className="size-8 text-primary" aria-hidden />
                      {t("ocrMedicalInformation")}
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-3xl border-2 border-border bg-card p-4 shadow-card">
                      <div className="relative min-w-0 flex-1">
                        <Search
                          className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <input
                          type="search"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder={t("ocrSearchPlaceholder")}
                          aria-label={t("ocrSearchPlaceholder")}
                          className="w-full rounded-full border-2 border-border bg-background py-4 pl-14 pr-4 text-lg outline-none focus:border-primary"
                        />
                      </div>
                      <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label={t("ocrFilterAll")}
                      >
                        {FILTERS.map((chip) => (
                          <button
                            key={chip.kind}
                            type="button"
                            onClick={() => setFilter(chip.kind)}
                            aria-pressed={filter === chip.kind}
                            className={cn(
                              "min-h-11 rounded-full border-2 px-4 text-base font-bold",
                              filter === chip.kind
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground",
                            )}
                          >
                            {t(chip.key)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {result.ocr?.rawText ? (
                    <div className="mt-4">
                      <ListenButton text={spokenSummary} label={t("ocrReadAloud")} />
                    </div>
                  ) : null}

                  {showSection("medicines") && medicines.length ? (
                    <section aria-label={t("ocrMedicines")} className="mt-6">
                      <h2 className="text-2xl font-extrabold">{t("ocrMedicines")}</h2>
                      <div className="mt-3 grid gap-4 xl:grid-cols-2">
                        {medicines.map((medicine) => (
                          <MedicineCard key={medicine.name} medicine={medicine} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {showSection("investigations") && investigations.length ? (
                    <section aria-label={t("ocrTestResults")} className="mt-6">
                      <h2 className="text-2xl font-extrabold">{t("ocrTestResults")}</h2>
                      <div className="mt-3 grid gap-4 xl:grid-cols-2">
                        {investigations.map((investigation) => (
                          <InvestigationCard
                            key={investigation.test}
                            investigation={investigation}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {showSection("procedures") && procedures.length ? (
                    <section aria-label={t("ocrProcedures")} className="mt-6">
                      <h2 className="text-2xl font-extrabold">{t("ocrProcedures")}</h2>
                      <div className="mt-3 grid gap-4 xl:grid-cols-2">
                        {procedures.map((procedure) => (
                          <ProcedureCard key={procedure.name} procedure={procedure} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {showSection("diagnoses") && (
                    <section aria-label={t("ocrDiagnosesDocumented")} className="mt-6">
                      <h2 className="flex items-center gap-2 text-2xl font-extrabold">
                        <Stethoscope className="size-7 text-primary" aria-hidden />
                        {t("ocrDiagnosesDocumented")}
                      </h2>
                      {diagnoses.length ? (
                        <div className="mt-3 grid gap-4 xl:grid-cols-2">
                          {diagnoses.map((diagnosis) => (
                            <article
                              key={diagnosis.name}
                              className="rounded-3xl border-2 border-border bg-card p-5 shadow-card"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <h3 className="text-2xl font-extrabold">{diagnosis.name}</h3>
                                <ConfidenceBadge level={diagnosis.confidence} />
                              </div>
                              <Evidence evidence={diagnosis.evidence} />
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-3xl border-2 border-border bg-card p-6 text-lg text-muted-foreground shadow-card">
                          {t("ocrNoDiagnosis")}
                        </p>
                      )}
                    </section>
                  )}

                  {showSection("all") && instructions.length ? (
                    <section aria-label={t("ocrAdditionalInstructions")} className="mt-6">
                      <h2 className="flex items-center gap-2 text-2xl font-extrabold">
                        <ListChecks className="size-7 text-primary" aria-hidden />
                        {t("ocrAdditionalInstructions")}
                      </h2>
                      <ul className="mt-3 grid gap-2">
                        {instructions.map((instruction, index) => (
                          <li
                            key={`${instruction}-${index}`}
                            className="flex items-start gap-3 rounded-2xl border-2 border-border bg-card p-4 text-lg font-semibold shadow-card"
                          >
                            <span
                              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                              aria-hidden
                            />
                            {instruction}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {!hasResults && (query || filter !== "all") ? (
                    <p className="mt-6 text-lg text-muted-foreground">
                      {t("ocrNoMatches").replace("{query}", query)}
                    </p>
                  ) : null}

                  <details className="mt-6 rounded-3xl border-2 border-border bg-card p-5 shadow-card">
                    <summary className="cursor-pointer text-lg font-bold">
                      {t("ocrOriginalText")}
                    </summary>
                    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-muted p-4 text-base">
                      {result.ocr?.rawText || t("ocrOriginalNoText")}
                    </pre>
                  </details>
                </>
              ) : null}
            </main>
          </div>

          {analysis || hasOcrText ? (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-lift backdrop-blur">
              <div className="mx-auto flex max-w-5xl flex-col gap-3">
                {saveError ? (
                  <p
                    role="alert"
                    className="flex items-center gap-2 rounded-2xl border-2 border-destructive/40 bg-destructive-soft px-4 py-3 text-base font-bold text-destructive"
                  >
                    <XCircle className="size-5 shrink-0" aria-hidden /> {saveError}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-semibold text-muted-foreground">
                    {t("ocrSaveHint")}
                  </p>
                  {saveState === "saved" ? (
                    <p className="flex items-center gap-2 rounded-full bg-success-soft px-5 py-3 text-lg font-extrabold text-success">
                      <CheckCircle2 className="size-6" aria-hidden /> {t("ocrSaveSuccess")}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saveState === "saving"}
                      aria-label={t("ocrSaveContinue")}
                      className="inline-flex min-h-16 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground shadow-lift disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saveState === "saving" ? (
                        <>
                          <Loader2 className="size-7 animate-spin" aria-hidden /> {t("ocrSaving")}
                        </>
                      ) : (
                        <>
                          <Save className="size-7" aria-hidden /> {t("ocrSaveContinue")}
                          <ArrowRight className="size-7" aria-hidden />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <section
          aria-label={t("ocrUploadTitle")}
          className="animate-rise grid gap-6 md:grid-cols-2"
        >
          <button
            type="button"
            onClick={pickFile}
            className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-4xl border-2 border-dashed border-primary/50 bg-card p-8 text-center shadow-card transition-transform hover:-translate-y-1"
          >
            <span className="grid size-20 place-items-center rounded-full bg-primary-soft text-primary">
              <Upload className="size-10" aria-hidden />
            </span>
            <span className="text-2xl font-extrabold">{t("ocrUploadTitle")}</span>
            <span className="max-w-md text-lg text-muted-foreground">{t("ocrUploadText")}</span>
            <span className="mt-2 rounded-full bg-accent px-4 py-1 text-sm font-bold text-accent-foreground">
              JPG · PNG · WEBP · BMP · TIFF
            </span>
          </button>

          <div className="flex flex-col justify-center gap-4 rounded-4xl border-2 border-border bg-card p-8 shadow-card">
            <h2 className="text-2xl font-extrabold">{t("ocrHowItHelps")}</h2>
            <ol className="grid gap-3 text-lg">
              <li className="flex items-start gap-3">
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-base font-extrabold text-primary-foreground"
                  aria-hidden
                >
                  1
                </span>
                <span>
                  <strong>{t("ocrStep1Title")}</strong> {t("ocrStep1Text")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-base font-extrabold text-primary-foreground"
                  aria-hidden
                >
                  2
                </span>
                <span>
                  <strong>{t("ocrStep2Title")}</strong> {t("ocrStep2Text")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-base font-extrabold text-primary-foreground"
                  aria-hidden
                >
                  3
                </span>
                <span>
                  <strong>{t("ocrStep3Title")}</strong> {t("ocrStep3Text")}
                </span>
              </li>
            </ol>
            <Link
              to="/papers"
              className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-border bg-card px-5 text-base font-bold"
            >
              <ArrowLeft className="size-5" /> {t("ocrStandardReader")}
            </Link>
          </div>
        </section>
      )}

      {fullscreen && previewUrl ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("ocrOriginalDocument")}
          onClick={() => setFullscreen(false)}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-lg font-bold text-white">{t("ocrOriginalDocument")}</p>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-base font-bold text-white"
            >
              <Minimize2 className="size-5" /> {t("ocrClose")}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">{renderImage({ fixed: false })}</div>
        </div>
      ) : null}
    </KioskShell>
  );
}

const OCR_IMAGE_CODES = new Set([
  "INVALID_FILE",
  "FILE_TOO_LARGE",
  "NO_TEXT",
  "UNSUPPORTED_TYPE",
  "NO_IMAGE",
  "OCR_FAILED",
]);

function ocrMessageFor(code: string | undefined, t: (key: TranslationKey) => string): string {
  switch (code) {
    case "NO_TEXT":
      return t("ocrErrNoText");
    case "FILE_TOO_LARGE":
      return t("ocrErrTooLarge");
    case "UNSUPPORTED_TYPE":
      return t("ocrErrUnsupported");
    case "OCR_FAILED":
      return t("ocrErrFailed");
    default:
      return OCR_IMAGE_CODES.has(code ?? "") ? t("ocrErrGeneric") : t("ocrErrAnalyze");
  }
}
