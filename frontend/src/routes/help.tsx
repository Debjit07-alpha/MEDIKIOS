import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, HandHelping, PhoneCall } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Call a helper — MediKiosk" },
      { name: "description", content: "Call hospital staff to the kiosk, or continue with audio guidance at your own pace." },
      { property: "og:title", content: "Call a helper — MediKiosk" },
      { property: "og:description", content: "Help is one big button away at every step of the kiosk journey." },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <KioskShell showSteps={false}>
      <PageHeading
        title="Do you need help?"
        subtitle="A hospital helper can come to this kiosk."
        listenText="Do you need help? Touch call a helper and someone will come to this kiosk."
      />

      <div className="grid gap-5">
        <div className="animate-rise rounded-4xl border-2 border-warning/40 bg-warning-soft p-8">
          <BellRing className="size-12 text-warning-foreground" />
          <h2 className="mt-4 text-4xl text-warning-foreground">Call a helper</h2>
          <p className="mt-2 text-xl text-warning-foreground/80">
            The OPD help desk gets a message with this kiosk number (A-04).
          </p>
          <button
            type="button"
            onClick={() => alert("Helper called. Please wait at the kiosk.")}
            className="mt-6 inline-flex min-h-20 items-center gap-3 rounded-3xl bg-warning px-10 text-2xl font-extrabold text-warning-foreground shadow-lift active:scale-[0.99]"
          >
            <PhoneCall className="size-8" /> Call now
          </button>
        </div>

        <div className="rounded-4xl border border-border bg-card p-8">
          <HandHelping className="size-10 text-primary" />
          <h2 className="mt-4 text-3xl">I can also read everything aloud</h2>
          <p className="mt-2 text-xl text-muted-foreground">
            Every screen has a speaker button. Touch it any time to hear the instructions again.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ListenButton text="Every screen has a speaker button. Touch it any time to hear the instructions again." />
            <Link
              to="/dashboard"
              className="inline-flex min-h-14 items-center rounded-full border-2 border-border bg-card px-8 text-xl font-bold"
            >
              Go back
            </Link>
          </div>
        </div>
      </div>
    </KioskShell>
  );
}
