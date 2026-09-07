import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, HandHelping, PhoneCall } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { useLanguage } from "@/lib/kiosk-hooks";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Call a helper — MediKiosk" },
      {
        name: "description",
        content:
          "Call hospital staff to the kiosk, or continue with audio guidance at your own pace.",
      },
      { property: "og:title", content: "Call a helper — MediKiosk" },
      {
        property: "og:description",
        content: "Help is one big button away at every step of the kiosk journey.",
      },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const { t } = useLanguage();
  return (
    <KioskShell showSteps={false}>
      <PageHeading
        title={t("helpTitle")}
        subtitle={t("helpSubtitle")}
        listenText={`${t("helpTitle")} ${t("callHelper")}`}
      />

      <div className="grid gap-5">
        <div className="animate-rise rounded-4xl border-2 border-warning/40 bg-warning-soft p-8">
          <BellRing className="size-12 text-warning-foreground" />
          <h2 className="mt-4 text-4xl text-warning-foreground">{t("callHelper")}</h2>
          <p className="mt-2 text-xl text-warning-foreground/80">
            The OPD help desk gets a message with this kiosk number (A-04).
          </p>
          <button
            type="button"
            onClick={() => alert(t("helperCalled"))}
            className="mt-6 inline-flex min-h-20 items-center gap-3 rounded-3xl bg-warning px-10 text-2xl font-extrabold text-warning-foreground shadow-lift active:scale-[0.99]"
          >
            <PhoneCall className="size-8" /> {t("callNow")}
          </button>
        </div>

        <div className="rounded-4xl border border-border bg-card p-8">
          <HandHelping className="size-10 text-primary" />
          <h2 className="mt-4 text-3xl">{t("readAloud")}</h2>
          <p className="mt-2 text-xl text-muted-foreground">{t("readAloudSub")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ListenButton text={t("readAloudSub")} label={t("listen")} />
            <Link
              to="/dashboard"
              className="inline-flex min-h-14 items-center rounded-full border-2 border-border bg-card px-8 text-xl font-bold"
            >
              {t("goBack")}
            </Link>
          </div>
        </div>
      </div>
    </KioskShell>
  );
}
