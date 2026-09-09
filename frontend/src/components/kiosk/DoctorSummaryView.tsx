import { Stethoscope } from "lucide-react";

type SectionItem = {
  label: string;
  value: string;
  verbatim?: boolean;
};

type Section = {
  title: string;
  items: SectionItem[];
};

type DoctorSummaryData = {
  patientLanguage?: string;
  careMode?: string;
  patient?: {
    name: string;
    age: number;
    sex: string;
    uhid: string;
  } | null;
  sections: Section[];
  text?: string;
  generatedBy?: string;
};

export function DoctorSummaryView({
  summary,
}: {
  summary: DoctorSummaryData;
}) {
  if (!summary?.sections?.length) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card">
        <p className="text-lg text-muted-foreground">
          No doctor summary available.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 rounded-3xl border-2 border-primary bg-primary-soft p-5 shadow-card">
        <Stethoscope className="size-8 text-primary" />
        <div>
          <p className="text-2xl font-extrabold">English Doctor Summary</p>
          <p className="text-sm text-muted-foreground">
            Generated for clinical review
            {summary.generatedBy === "ai" ? " (AI-enhanced)" : ""}
          </p>
        </div>
      </div>

      {summary.patient ? (
        <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-card">
          <h3 className="text-xl font-extrabold">Patient Information</h3>
          <dl className="mt-3 grid gap-2">
            <div className="flex gap-3">
              <dt className="min-w-[120px] text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Name
              </dt>
              <dd className="text-lg font-semibold">
                {summary.patient.name || "Not provided"}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="min-w-[120px] text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Age
              </dt>
              <dd className="text-lg font-semibold">
                {summary.patient.age ?? "Not provided"}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="min-w-[120px] text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Sex
              </dt>
              <dd className="text-lg font-semibold">
                {summary.patient.sex || "Not provided"}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="min-w-[120px] text-sm font-bold uppercase tracking-wider text-muted-foreground">
                UHID
              </dt>
              <dd className="text-lg font-semibold">
                {summary.patient.uhid || "Not provided"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {summary.sections
        .filter((s) => s.title !== "Patient Information")
        .map((section) => (
          <section
            key={section.title}
            className="rounded-4xl border-2 border-border bg-card p-6 shadow-card"
          >
            <h3 className="text-2xl font-extrabold">{section.title}</h3>
            <dl className="mt-4 grid gap-3">
              {section.items.map((item, idx) => (
                <div
                  key={`${section.title}-${idx}`}
                  className="rounded-2xl border border-border p-4"
                >
                  <dt className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold whitespace-pre-wrap">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
    </div>
  );
}
