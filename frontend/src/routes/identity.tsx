import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, IdCard, Fingerprint, UserRoundPlus, Loader2, CheckCircle2 } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { BigChoice } from "@/components/kiosk/BigChoice";
import { useKiosk, type Patient } from "@/lib/kiosk-store";

export const Route = createFileRoute("/identity")({
  head: () => ({
    meta: [
      { title: "Find your record — MediKiosk" },
      { name: "description", content: "Identify yourself with an ABHA health number, an Aadhaar fingerprint, or register as a new patient." },
      { property: "og:title", content: "Find your record — MediKiosk" },
      { property: "og:description", content: "Three simple ways to open your hospital record at the kiosk." },
    ],
  }),
  component: IdentityPage,
});

const RESULT: Patient = {
  name: "Ramesh Prasad Yadav",
  age: 68,
  sex: "Male",
  uhid: "DGH/2026/10412",
  route: "abha",
};

const OPTIONS = [
  {
    id: "abha" as const,
    icon: <IdCard className="size-8" />,
    title: "I have an ABHA health number",
    subtitle: "14 digit health ID card",
    working: "Reading your ABHA number…",
  },
  {
    id: "aadhaar" as const,
    icon: <Fingerprint className="size-8" />,
    title: "Use my Aadhaar fingerprint",
    subtitle: "Place your thumb on the scanner below the screen",
    working: "Matching your fingerprint…",
  },
  {
    id: "new" as const,
    icon: <UserRoundPlus className="size-8" />,
    title: "I am a new patient",
    subtitle: "First time in this hospital",
    working: "Creating your new hospital record…",
  },
];

function IdentityPage() {
  const { setPatient } = useKiosk();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Patient | null>(null);

  const run = (id: Patient["route"]) => {
    setBusy(id);
    window.setTimeout(() => {
      const patient: Patient =
        id === "new"
          ? { name: "New Patient", age: 62, sex: "Not stated", uhid: "DGH/2026/NEW-882", route: "new" }
          : { ...RESULT, route: id };
      setPatient(patient);
      setDone(patient);
      setBusy(null);
    }, 1800);
  };

  return (
    <KioskShell step="identity">
      <PageHeading
        title="How can I find you?"
        subtitle="Choose any one way. All three work the same."
        listenText="How can I find you? You can use your A B H A health number, your Aadhaar fingerprint, or register as a new patient."
      />

      {done ? (
        <div className="animate-rise rounded-4xl border-2 border-success bg-success-soft p-8 text-center">
          <CheckCircle2 className="mx-auto size-16 text-success" />
          <h2 className="mt-4 text-4xl">Found you</h2>
          <p className="mt-2 text-2xl font-bold">{done.name}</p>
          <p className="text-lg text-muted-foreground">
            {done.age} yrs · {done.sex} · {done.uhid}
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/care" })}
            className="mt-8 inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-3xl font-extrabold text-primary-foreground shadow-lift active:scale-[0.99]"
          >
            This is me <ArrowRight className="size-8" />
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {OPTIONS.map((o) => (
            <BigChoice
              key={o.id}
              icon={o.icon}
              title={o.title}
              subtitle={busy === o.id ? o.working : o.subtitle}
              onClick={() => !busy && run(o.id)}
              selected={busy === o.id}
              trailing={
                busy === o.id ? (
                  <Loader2 className="size-9 animate-spin text-primary" />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-full border border-border">
                    <ArrowRight className="size-6" />
                  </span>
                )
              }
            />
          ))}
        </div>
      )}
    </KioskShell>
  );
}
