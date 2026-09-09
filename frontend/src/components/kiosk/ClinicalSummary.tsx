import { useState } from "react";
import { Pencil, Check, X, Save } from "lucide-react";
import { type CareMode, type ExtractedDoc } from "@/lib/kiosk-data";
import { DocumentCard } from "./DocumentCard";
import { ListenButton } from "./ListenButton";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/kiosk-hooks";
import type { SummaryRow } from "@/lib/buildSummary";

export type { SummaryRow } from "@/lib/buildSummary";

export function ClinicalSummary({
  mode,
  rows,
  documents,
  editable,
  onChange,
}: {
  mode: CareMode;
  rows: SummaryRow[];
  documents: ExtractedDoc[];
  editable?: boolean;
  onChange?: (rows: SummaryRow[]) => void;
}) {
  const { language, t } = useLanguage();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const sections = rows.reduce<Record<string, SummaryRow[]>>((acc, row) => {
    (acc[row.section] ??= []).push(row);
    return acc;
  }, {});

  const spoken = rows.map((r) => `${r.label}: ${r.value}.`).join(" ");

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-card">
        <p className="min-w-0 text-xl font-bold">
          {mode === "ayush" ? t("summaryModeAyush") : t("summaryModeAllopathy")}
        </p>
        <ListenButton text={spoken} label={t("summaryRead")} />
      </div>

      {Object.entries(sections).map(([section, items]) => (
        <section
          key={section}
          className="rounded-4xl border-2 border-border bg-card p-6 shadow-card"
        >
          <h3 className="text-2xl font-extrabold">{section}</h3>
          <dl className="mt-4 grid gap-3">
            {items.map((row) => {
              const isEditing = editing === row.field + row.label;
              return (
                <div
                  key={row.field + row.label}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border p-4"
                >
                  <div className="min-w-0">
                    <dt className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      {row.label}
                    </dt>
                    {isEditing ? (
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-xl border-2 border-primary bg-background p-3 text-lg"
                      />
                    ) : (
                      <dd
                        className={cn(
                          "mt-1 text-xl font-semibold",
                          row.value === t("notAnswered") && "text-muted-foreground italic",
                        )}
                      >
                        {row.value}
                      </dd>
                    )}
                  </div>
                  {editable ? (
                    isEditing ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-label={t("summarySaveField")}
                          onClick={() => {
                            onChange?.(
                              rows.map((r) =>
                                r === row ? { ...r, value: draft || t("notAnswered") } : r,
                              ),
                            );
                            setEditing(null);
                          }}
                          className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground"
                        >
                          <Save className="size-5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("summaryCancelEdit")}
                          onClick={() => setEditing(null)}
                          className="grid size-11 place-items-center rounded-full border border-border"
                        >
                          <X className="size-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`${t("summaryEdit")} ${row.label}`}
                        onClick={() => {
                          setEditing(row.field + row.label);
                          setDraft(row.value === t("notAnswered") ? "" : row.value);
                        }}
                        className="grid size-11 place-items-center rounded-full border border-border"
                      >
                        <Pencil className="size-5" />
                      </button>
                    )
                  ) : (
                    <Check className="size-6 text-success" />
                  )}
                </div>
              );
            })}
          </dl>
        </section>
      ))}

      {documents.length ? (
        <section className="grid gap-4">
          <h3 className="text-2xl font-extrabold">{t("summaryDocsTitle")}</h3>
          {documents.map((d) => (
            <DocumentCard key={d.id} doc={d} compact />
          ))}
        </section>
      ) : null}
    </div>
  );
}
