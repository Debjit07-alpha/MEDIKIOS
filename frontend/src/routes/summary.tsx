import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ClinicalSummary } from "@/components/kiosk/ClinicalSummary";
import { buildSummary, type SummaryRow } from "@/lib/buildSummary";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { translate } from "@/lib/i18n";

export const Route = createFileRoute("/summary")({
  head: () => ({
    meta: [
      { title: "Your summary for the doctor — MediKiosk" },
      {
        name: "description",
        content:
          "A structured clinical summary built from your answers and scanned papers, ready for the doctor to review, edit or confirm.",
      },
      { property: "og:title", content: "Your summary for the doctor — MediKiosk" },
      {
        property: "og:description",
        content:
          "Structured Allopathy or AYUSH history, documents and abnormal values in one place.",
      },
    ],
  }),
  component: SummaryPage,
});

function SummaryPage() {
  const { careMode, answers, documents, redFlag } = useKiosk();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const mode = careMode ?? "allopathy";
  const [rows, setRows] = useState<SummaryRow[]>([]);

  useEffect(() => {
    setRows(buildSummary(mode, answers, translate(language, "notAnswered"), language));
  }, [mode, answers, language]);

  return (
    <KioskShell step="summary">
      <PageHeading
        title={t("summaryTitle")}
        subtitle={t("summarySubtitle")}
        listenText={`${t("summaryTitle")}. ${t("summarySubtitle")}`}
      />

      {redFlag ? (
        <div className="mb-6 flex items-center gap-4 rounded-3xl border-2 border-destructive bg-destructive-soft p-5">
          <AlertTriangle className="size-9 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-xl font-extrabold text-destructive">{t("priorityCase")}</p>
            <p className="text-lg">{redFlag.detail}</p>
          </div>
        </div>
      ) : null}

      <ClinicalSummary mode={mode} rows={rows} documents={documents} editable onChange={setRows} />

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={() => navigate({ to: "/share" })}
          className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-2xl font-extrabold text-primary-foreground shadow-lift"
        >
          {t("summaryCorrect")} <ArrowRight className="size-7" />
        </button>
      </div>
    </KioskShell>
  );
}
