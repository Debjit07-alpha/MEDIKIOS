import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Delete, IdCard } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { IdentityResult } from "@/components/kiosk/IdentityResult";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/identity/abha/input")({ component: AbhaInputPage });

function AbhaInputPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { abhaNumber, setAbhaNumber, clearIdentityMethod } = useKiosk();
  const [submitted, setSubmitted] = useState(false);
  const valid = /^\d{14}$/.test(abhaNumber);

  if (submitted) {
    return (
      <IdentityResult
        autoStart
        method="abha"
        submit={() => api.patients.identify({ method: "abha", value: abhaNumber })}
      />
    );
  }

  const append = (digit: string) => {
    if (abhaNumber.length < 14) setAbhaNumber(`${abhaNumber}${digit}`);
  };
  const goBack = () => {
    clearIdentityMethod();
    navigate({ to: "/identity" });
  };

  return (
    <KioskShell step="identity">
      <PageHeading
        title={t("identityFindRecordTitle")}
        subtitle={t("identityFindRecordSubtitle")}
      />
      <div className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-8 shadow-card sm:p-10">
        <div className="flex items-center gap-4">
          <IdCard className="size-12 text-primary" />
          <h2 className="text-3xl font-extrabold">{t("identityTypeAbha")}</h2>
        </div>
        <input
          value={abhaNumber}
          onChange={(event) => setAbhaNumber(event.target.value.replace(/\D/g, "").slice(0, 14))}
          inputMode="numeric"
          maxLength={14}
          placeholder={t("identityAbhaPlaceholder")}
          aria-label={t("identityTypeAbha")}
          className="mt-7 w-full rounded-2xl border-2 border-primary bg-background p-5 text-center text-3xl tracking-[0.25em]"
        />
        {!valid ? (
          <p className="mt-3 text-center font-semibold text-destructive">
            {t("identityAbhaValidation")}
          </p>
        ) : null}
        <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-md sm:mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => append(digit)}
              className="min-h-16 rounded-2xl border-2 border-border bg-card text-2xl font-bold"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAbhaNumber("")}
            className="min-h-16 rounded-2xl border-2 border-border bg-card text-lg font-bold"
          >
            {t("identityClear")}
          </button>
          <button
            type="button"
            onClick={() => setAbhaNumber(abhaNumber.slice(0, -1))}
            className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card text-lg font-bold"
          >
            <Delete className="size-5" />
            {t("identityBackspace")}
          </button>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={!valid}
            className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground disabled:opacity-40"
          >
            {t("identityFindMyRecord")} <ArrowRight className="size-7" />
          </button>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-20 items-center gap-2 rounded-full border-2 border-border bg-card px-10 text-2xl font-bold"
          >
            <ArrowLeft className="size-6" />
            {t("back")}
          </button>
        </div>
      </div>
    </KioskShell>
  );
}
