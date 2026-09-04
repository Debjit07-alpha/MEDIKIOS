import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, XCircle, UserRoundCheck, FileLock2, ShieldCheck } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { useKiosk } from "@/lib/kiosk-store";

const POINTS = [
  {
    icon: UserRoundCheck,
    title: "I will ask about your health",
    text: "Simple questions about your problem, medicines and past illness.",
  },
  {
    icon: FileLock2,
    title: "Your papers stay safe",
    text: "Reports you scan are stored only in your hospital record.",
  },
  {
    icon: ShieldCheck,
    title: "Only your doctor sees it",
    text: "Nothing is shared outside the hospital without asking you again.",
  },
];

const FULL_CONSENT = POINTS.map((p) => `${p.title}. ${p.text}`).join(" ");

export const Route = createFileRoute("/consent")({
  head: () => ({
    meta: [
      { title: "Audio consent — MediKiosk" },
      { name: "description", content: "Listen to the consent message and agree before MediKiosk records your health history." },
      { property: "og:title", content: "Audio consent — MediKiosk" },
      { property: "og:description", content: "Spoken, plain-language consent before any health question is asked." },
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const { giveConsent } = useKiosk();
  const navigate = useNavigate();

  return (
    <KioskShell step="consent">
      <PageHeading
        title="May I ask you some health questions?"
        subtitle="Please listen to the message, then choose."
      />
      <ListenButton text={FULL_CONSENT} label="Play consent" autoPlay />

      <div className="mt-6 grid gap-4">
        {POINTS.map((p) => (
          <div
            key={p.title}
            className="animate-rise grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-card"
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
              <p.icon className="size-7" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-tight">{p.title}</p>
              <p className="text-lg text-muted-foreground">{p.text}</p>
            </div>
            <ListenButton text={`${p.title}. ${p.text}`} label="" size="sm" />
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            giveConsent();
            navigate({ to: "/identity" });
          }}
          className="inline-flex min-h-24 items-center justify-center gap-3 rounded-3xl bg-success px-8 text-3xl font-extrabold text-success-foreground shadow-lift active:scale-[0.99]"
        >
          <CheckCircle2 className="size-9" /> Yes, I agree
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/help" })}
          className="inline-flex min-h-24 items-center justify-center gap-3 rounded-3xl border-2 border-border bg-card px-8 text-3xl font-extrabold active:scale-[0.99]"
        >
          <XCircle className="size-9" /> No, I need help
        </button>
      </div>
    </KioskShell>
  );
}
