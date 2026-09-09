import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, PhoneCall, ArrowRight } from "lucide-react";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { speak, stopSpeaking } from "@/lib/speech";

export function RedFlagOverlay() {
  const { redFlag, clearRedFlag } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!redFlag) return;
    speak(`${t("continueQuestions")}. ${t("callStaff")}.`);
    return () => stopSpeaking();
  }, [redFlag, t]);

  if (!redFlag) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={t("possibleEmergency")}
      className="fixed inset-0 z-50 grid place-items-center bg-destructive/25 p-4 backdrop-blur-sm"
    >
      <div className="animate-alert-pulse w-full max-w-3xl rounded-4xl border-4 border-destructive bg-card p-8 shadow-lift">
        <div className="flex items-center gap-4">
          <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-destructive-soft text-destructive">
            <AlertTriangle className="size-12" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-widest text-destructive">
              {t("possibleEmergency")}
            </p>
            <h2 className="text-4xl text-destructive">{t("redFlagPleaseWait")}</h2>
          </div>
        </div>

        <p className="mt-6 text-2xl font-semibold leading-snug">{t("redFlagBody")}</p>
        <div className="mt-4 rounded-3xl border-2 border-destructive/30 bg-destructive-soft p-5">
          <p className="text-lg font-bold text-destructive">{redFlag.label}</p>
          <p className="mt-1 text-lg text-foreground">{redFlag.detail}</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              navigate({ to: "/summary" });
            }}
            className="inline-flex min-h-20 items-center justify-center gap-3 rounded-3xl bg-destructive px-6 text-2xl font-extrabold text-destructive-foreground shadow-lift active:scale-[0.99]"
          >
            <PhoneCall className="size-7" /> {t("callStaff")}
          </button>
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              clearRedFlag();
            }}
            className="inline-flex min-h-20 items-center justify-center gap-3 rounded-3xl border-2 border-border bg-card px-6 text-2xl font-extrabold active:scale-[0.99]"
          >
            {t("continueQuestions")} <ArrowRight className="size-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
