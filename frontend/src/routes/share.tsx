import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Building2, IdCard, Ban } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { useKiosk } from "@/lib/kiosk-store";

const CONSENT_TEXT =
  "May I send this summary to your doctor and your A B H A health record? You can also keep it only inside this hospital.";

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Sharing consent — MediKiosk" },
      { name: "description", content: "Decide whether your summary goes to the hospital system only, or also to your ABHA health record." },
      { property: "og:title", content: "Sharing consent — MediKiosk" },
      { property: "og:description", content: "Explicit, spoken consent before any record leaves the hospital." },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const { markShared, confirmSummary } = useKiosk();
  const navigate = useNavigate();

  const finish = (share: boolean) => {
    confirmSummary();
    if (share) markShared();
    navigate({ to: "/done" });
  };

  return (
    <KioskShell step="share">
      <PageHeading
        title="Where should I send this?"
        subtitle="Your summary is ready. Please choose one."
      />
      <ListenButton text={CONSENT_TEXT} label="Play message" autoPlay />

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => finish(true)}
          className="flex min-h-64 flex-col justify-between rounded-4xl border-2 border-primary bg-primary-soft p-7 text-left shadow-card transition-transform hover:-translate-y-1 active:scale-[0.99]"
        >
          <IdCard className="size-12 text-primary" />
          <div>
            <p className="text-3xl font-extrabold leading-tight">Doctor + my ABHA record</p>
            <p className="mt-2 text-lg text-muted-foreground">
              Any hospital you visit later can see it with your permission.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => finish(false)}
          className="flex min-h-64 flex-col justify-between rounded-4xl border-2 border-border bg-card p-7 text-left shadow-card transition-transform hover:-translate-y-1 active:scale-[0.99]"
        >
          <Building2 className="size-12 text-primary" />
          <div>
            <p className="text-3xl font-extrabold leading-tight">Only this hospital</p>
            <p className="mt-2 text-lg text-muted-foreground">
              Sent to the hospital system (HIS) for today's doctor only.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => finish(false)}
          className="flex min-h-64 flex-col justify-between rounded-4xl border-2 border-border bg-card p-7 text-left shadow-card transition-transform hover:-translate-y-1 active:scale-[0.99]"
        >
          <Ban className="size-12 text-muted-foreground" />
          <div>
            <p className="text-3xl font-extrabold leading-tight">Do not share yet</p>
            <p className="mt-2 text-lg text-muted-foreground">
              I will show the printed summary to the doctor myself.
            </p>
          </div>
        </button>
      </div>

      <p className="mt-8 flex items-center gap-3 text-lg text-muted-foreground">
        <ShieldCheck className="size-6 shrink-0 text-success" />
        You can withdraw this permission at the help desk at any time.
      </p>
    </KioskShell>
  );
}
