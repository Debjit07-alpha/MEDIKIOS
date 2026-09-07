import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Stethoscope, Leaf } from "lucide-react";
import { ClinicalSummary, buildSummary, type SummaryRow } from "@/components/kiosk/ClinicalSummary";
import { DOC_LIBRARY, QUEUE, type CareMode } from "@/lib/kiosk-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/$patientId")({
  head: () => ({
    meta: [
      { title: "Patient intake review — MediKiosk" },
      {
        name: "description",
        content:
          "Physician-ready structured history, digitised documents, timeline and abnormal values with edit, confirm and reject actions.",
      },
      { property: "og:title", content: "Patient intake review — MediKiosk" },
      {
        property: "og:description",
        content:
          "Review, edit and confirm the kiosk-generated clinical summary before consultation.",
      },
    ],
  }),
  component: PatientReview,
});

/** Demo answers so a physician can review a realistic completed intake. */
const DEMO_ANSWERS: Record<CareMode, Record<string, string[]>> = {
  allopathy: {
    chief_complaint: ["chest"],
    onset: ["today"],
    severity: ["severe"],
    chest_alarm: ["arm", "sweat"],
    past_history: ["dm", "htn"],
    drug_history: ["yes_regular"],
    allergy: ["no"],
    family_history: ["heart", "dm"],
    personal_history: ["smoke"],
    ros: ["weight", "urine"],
    prior_investigations: ["blood"],
  },
  ayush: {
    chief_complaint: ["joints"],
    onset: ["long"],
    severity: ["moderate"],
    general_alarm: ["none"],
    prakriti: ["vata"],
    vikriti: ["gas", "pain"],
    sara: ["madhyama"],
    samhanana: ["medium"],
    pramana: ["loss"],
    satmya: ["light"],
    sattva: ["medium"],
    ahara_shakti: ["irregular"],
    vyayama_shakti: ["medium"],
    vaya: ["vriddha"],
    nidana: ["cold", "food"],
    samprapti: ["slow"],
  },
};

function PatientReview() {
  const { patientId } = useParams({ from: "/staff/$patientId" });
  const patient = QUEUE.find((p) => p.id === patientId) ?? QUEUE[0]!;
  const mode = patient.mode;
  const [rows, setRows] = useState<SummaryRow[]>(() => buildSummary(mode, DEMO_ANSWERS[mode]));
  const [status, setStatus] = useState<"pending" | "confirmed" | "rejected">("pending");

  const documents =
    patient.docs >= 3
      ? [DOC_LIBRARY.prescription, DOC_LIBRARY.lab, DOC_LIBRARY.discharge]
      : patient.docs === 2
        ? [DOC_LIBRARY.prescription, DOC_LIBRARY.lab]
        : patient.docs === 1
          ? [DOC_LIBRARY.lab]
          : [];

  const abnormal = documents.flatMap((d) => d.values?.filter((v) => v.abnormal) ?? []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/staff"
              aria-label="Back to queue"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-border"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold leading-tight">{patient.name}</h1>
              <p className="truncate text-sm text-muted-foreground">
                {patient.age} / {patient.sex} · {patient.uhid} · waiting {patient.waitedMinutes} min
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold",
              mode === "ayush" ? "bg-ayush-soft text-ayush" : "bg-accent text-primary",
            )}
          >
            {mode === "ayush" ? <Leaf className="size-4" /> : <Stethoscope className="size-4" />}
            {mode === "ayush" ? "AYUSH intake" : "Allopathy intake"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {patient.redFlag ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-destructive bg-destructive-soft p-5">
            <AlertTriangle className="mt-0.5 size-7 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-destructive">Red flag raised at kiosk</p>
              <p className="text-base">{patient.redFlag}</p>
            </div>
          </div>
        ) : null}

        {abnormal.length ? (
          <div className="mb-6 rounded-2xl border-2 border-warning/50 bg-warning-soft p-5">
            <p className="text-lg font-extrabold text-warning-foreground">
              Abnormal investigation values ({abnormal.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {abnormal.map((v) => (
                <span
                  key={v.name}
                  className="rounded-full bg-card px-4 py-1.5 text-sm font-bold text-destructive"
                >
                  {v.name}: {v.value} {v.unit} (normal {v.normal})
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <ClinicalSummary
          mode={mode}
          rows={rows}
          documents={documents}
          editable
          onChange={setRows}
        />

        <div className="sticky bottom-0 mt-8 grid gap-3 border-t border-border bg-background/95 py-4 backdrop-blur sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setStatus("confirmed");
              toast.success("Summary confirmed and pushed to the hospital record");
            }}
            className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-success px-6 text-xl font-extrabold text-success-foreground"
          >
            <CheckCircle2 className="size-6" /> Confirm summary
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("rejected");
              toast.error("Summary rejected — patient sent back for re-interview");
            }}
            className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-destructive bg-card px-6 text-xl font-extrabold text-destructive"
          >
            <XCircle className="size-6" /> Reject & re-interview
          </button>
          {status !== "pending" ? (
            <p className="sm:col-span-2 text-center text-base font-semibold text-muted-foreground">
              Status: {status}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
