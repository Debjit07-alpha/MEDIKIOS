import { AlertTriangle } from "lucide-react";
import type { ExtractedDoc } from "@/lib/kiosk-data";
import { ListenButton } from "./ListenButton";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/kiosk-hooks";

export function DocumentCard({ doc, compact }: { doc: ExtractedDoc; compact?: boolean }) {
  const { t } = useLanguage();
  const abnormal = doc.values?.filter((v) => v.abnormal) ?? [];
  const spoken = [
    `${doc.kindLabel} from ${doc.facility}, dated ${doc.date}.`,
    doc.diagnoses.length ? `${t("summaryTitle")}: ${doc.diagnoses.join(", ")}.` : "",
    doc.medications?.length
      ? `Medicines: ${doc.medications.map((m) => `${m.name} ${m.dose} ${m.schedule}`).join(", ")}.`
      : "",
    abnormal.length
      ? `${abnormal.length} values are outside the normal range: ${abnormal
          .map((v) => `${v.name} ${v.value} ${v.unit}`)
          .join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="rounded-4xl border-2 border-border bg-card p-6 shadow-card sm:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent px-4 py-1 text-base font-bold text-primary">
              {doc.kindLabel}
            </span>
            <span className="text-lg text-muted-foreground">{doc.date}</span>
          </div>
          <h2 className="mt-3 text-3xl leading-tight">{doc.title}</h2>
          <p className="text-lg text-muted-foreground">{doc.facility}</p>
        </div>
        <ListenButton text={spoken} label="Read to me" size={compact ? "sm" : "md"} />
      </div>

      {abnormal.length ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-warning/40 bg-warning-soft px-5 py-4">
          <AlertTriangle className="size-7 shrink-0 text-warning-foreground" />
          <p className="text-lg font-bold text-warning-foreground">
            {abnormal.length} values are outside the normal range. The doctor has been informed.
          </p>
        </div>
      ) : null}

      {doc.diagnoses.length ? (
        <section className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Diagnosis found
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {doc.diagnoses.map((d) => (
              <span
                key={d}
                className="rounded-full bg-accent px-4 py-2 text-lg font-semibold text-accent-foreground"
              >
                {d}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {doc.medications?.length ? (
        <section className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Medicines
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {doc.medications.map((m) => (
              <div key={m.name} className="rounded-2xl border border-border p-4">
                <p className="text-xl font-extrabold">{m.name}</p>
                <p className="text-base text-muted-foreground">
                  {m.dose} · {m.schedule} · {m.duration}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {doc.values?.length ? (
        <section className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Test values
          </h3>
          <div className="mt-2 grid gap-2">
            {doc.values.map((v) => (
              <div
                key={v.name}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-5 py-3",
                  v.abnormal ? "border-destructive/40 bg-destructive-soft" : "border-border",
                )}
              >
                <p className="truncate text-lg font-bold">{v.name}</p>
                <p className="flex items-baseline gap-2 whitespace-nowrap">
                  <span
                    className={cn(
                      "text-xl font-extrabold",
                      v.abnormal ? "text-destructive" : "text-success",
                    )}
                  >
                    {v.value} {v.unit}
                  </span>
                  <span className="text-sm text-muted-foreground">Normal: {v.normal}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {doc.note ? (
        <section className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Doctor's note
          </h3>
          <p className="mt-1 text-lg">{doc.note}</p>
        </section>
      ) : null}
    </article>
  );
}
