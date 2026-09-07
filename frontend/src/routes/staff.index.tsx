import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Stethoscope,
  Leaf,
  Clock,
  FileText,
  ChevronRight,
  HeartPulse,
  Home,
} from "lucide-react";
import { QUEUE, type QueuePatient } from "@/lib/kiosk-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Physician dashboard — MediKiosk" },
      {
        name: "description",
        content:
          "Waiting and completed kiosk intakes with red-flag priority, care mode and document counts for the OPD physician.",
      },
      { property: "og:title", content: "Physician dashboard — MediKiosk" },
      {
        property: "og:description",
        content: "Triage-first patient queue built from kiosk intakes.",
      },
    ],
  }),
  component: StaffDashboard,
});

const FILTERS = ["all", "red-flag", "completed", "waiting", "ayush"] as const;
type Filter = (typeof FILTERS)[number];

const LABELS: Record<Filter, string> = {
  all: "All patients",
  "red-flag": "Red flag",
  completed: "Intake completed",
  waiting: "Waiting",
  ayush: "AYUSH",
};

function match(p: QueuePatient, f: Filter) {
  if (f === "all") return true;
  if (f === "red-flag") return Boolean(p.redFlag);
  if (f === "ayush") return p.mode === "ayush";
  return p.status === f;
}

function StaffDashboard() {
  const [filter, setFilter] = useState<Filter>("all");
  const list = [...QUEUE]
    .filter((p) => match(p, filter))
    .sort((a, b) => Number(Boolean(b.redFlag)) - Number(Boolean(a.redFlag)));

  const flagged = QUEUE.filter((p) => p.redFlag).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <HeartPulse className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold leading-tight">Physician dashboard</h1>
              <p className="truncate text-sm text-muted-foreground">
                OPD Block A · Dr. S. Mehta · {QUEUE.length} patients today
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold"
          >
            <Home className="size-4" /> Kiosk
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {flagged ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-destructive bg-destructive-soft px-5 py-4">
            <AlertTriangle className="size-6 shrink-0 text-destructive" />
            <p className="text-lg font-bold text-destructive">
              {flagged} patient needs immediate triage review.
            </p>
          </div>
        ) : null}

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "min-h-11 rounded-full border px-5 text-sm font-semibold",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card",
              )}
            >
              {LABELS[f]}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          {list.map((p) => (
            <Link
              key={p.id}
              to="/staff/$patientId"
              params={{ patientId: p.id }}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border-2 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-card",
                p.redFlag ? "border-destructive" : "border-border",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-lg font-extrabold">{p.name}</p>
                  <span className="text-sm text-muted-foreground">
                    {p.age} / {p.sex} · {p.uhid}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold",
                      p.mode === "ayush" ? "bg-ayush-soft text-ayush" : "bg-accent text-primary",
                    )}
                  >
                    {p.mode === "ayush" ? (
                      <Leaf className="size-3" />
                    ) : (
                      <Stethoscope className="size-3" />
                    )}
                    {p.mode === "ayush" ? "AYUSH" : "Allopathy"}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-0.5 text-xs font-bold capitalize",
                      p.status === "completed"
                        ? "bg-success-soft text-success"
                        : p.status === "in-progress"
                          ? "bg-warning-soft text-warning-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.status.replace("-", " ")}
                  </span>
                </div>
                <p className="mt-1 truncate text-base">{p.complaint}</p>
                {p.redFlag ? (
                  <p className="mt-2 flex items-center gap-2 text-sm font-bold text-destructive">
                    <AlertTriangle className="size-4 shrink-0" /> {p.redFlag}
                  </p>
                ) : null}
                <p className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-4" /> waiting {p.waitedMinutes} min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="size-4" /> {p.docs} document(s)
                  </span>
                </p>
              </div>
              <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
