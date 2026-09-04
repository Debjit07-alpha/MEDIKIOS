import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HeartPulse, Stethoscope, UserRound, Languages, ShieldCheck, ScanLine } from "lucide-react";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { RedFlagOverlay } from "@/components/kiosk/RedFlagOverlay";
import { useKiosk } from "@/lib/kiosk-store";

const WELCOME =
  "Namaste. I will ask a few easy questions. You can speak your answer or touch a picture. It takes about five minutes.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediKiosk — Guided Health Assistant for Hospital OPD" },
      {
        name: "description",
        content:
          "Elderly-first AI kiosk that takes your clinical history by voice or touch, reads your hospital papers and prepares a ready summary for the doctor.",
      },
      { property: "og:title", content: "MediKiosk — Guided Health Assistant" },
      {
        property: "og:description",
        content:
          "Speak or touch to answer. MediKiosk prepares your clinical history and documents for the doctor in minutes.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  const { reset } = useKiosk();

  return (
    <div className="kiosk-surface flex min-h-screen flex-col">
      <header className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-6 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <HeartPulse className="size-8" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-3xl font-extrabold leading-none">MediKiosk</p>
            <p className="truncate text-base text-muted-foreground">
              District General Hospital · OPD Block A
            </p>
          </div>
        </div>
        <Link
          to="/staff"
          className="inline-flex min-h-14 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-6 text-lg font-bold shadow-card"
        >
          <Stethoscope className="size-6" /> <span className="hidden sm:inline">Staff login</span>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 pb-10 text-center">
        <span className="animate-rise rounded-full bg-success-soft px-5 py-2 text-base font-bold text-success">
          Kiosk ready · No queue token needed
        </span>
        <h1 className="animate-rise text-balance-tight mt-6 text-5xl leading-[1.05] sm:text-6xl">
          Namaste. Let us get you ready for the doctor.
        </h1>
        <p className="animate-rise mt-5 max-w-2xl text-xl text-muted-foreground sm:text-2xl">
          I will ask a few easy questions. You can speak your answer or touch a picture. It takes
          about five minutes.
        </p>

        <ListenButton text={WELCOME} label="Listen to instructions" className="mt-7" />

        <button
          type="button"
          onClick={() => {
            reset();
            navigate({ to: "/language" });
          }}
          className="mt-8 inline-flex min-h-28 w-full max-w-2xl items-center justify-center gap-4 rounded-4xl bg-primary px-8 text-4xl font-extrabold text-primary-foreground shadow-lift transition-transform active:scale-[0.99]"
        >
          <UserRound className="size-11" /> Touch here to start
        </button>

        <div className="mt-10 grid w-full gap-4 sm:grid-cols-3">
          {[
            { icon: Languages, title: "8 languages", text: "Hindi, English and more" },
            { icon: ShieldCheck, title: "Your consent first", text: "Nothing is shared without you" },
            { icon: ScanLine, title: "Papers read for you", text: "Prescriptions and lab reports" },
          ].map((f) => (
            <div key={f.title} className="rounded-3xl border border-border bg-card p-5 text-left shadow-card">
              <f.icon className="size-8 text-primary" />
              <p className="mt-3 text-xl font-extrabold">{f.title}</p>
              <p className="text-base text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
      <RedFlagOverlay />
    </div>
  );
}
