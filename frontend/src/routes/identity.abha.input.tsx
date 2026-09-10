import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Delete, IdCard, Loader2 } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";
import type { Patient } from "@/lib/kiosk-store";

export const Route = createFileRoute("/identity/abha/input")({ component: AbhaInputPage });

function AbhaInputPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { abhaNumber, setAbhaNumber, setPatient, clearIdentityMethod } = useKiosk();
  const [status, setStatus] = useState<"input" | "fetching" | "found" | "error">("input");
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isExact14 = /^\d{14}$/.test(abhaNumber);

  const append = (digit: string) => {
    if (abhaNumber.length < 14) {
      setAbhaNumber(`${abhaNumber}${digit}`);
      if (status === "error") setErrorMessage(null);
    }
  };

  const clear = () => {
    setAbhaNumber("");
    setErrorMessage(null);
    if (status === "error") setStatus("input");
  };

  const backspace = () => {
    setAbhaNumber(abhaNumber.slice(0, -1));
    setErrorMessage(null);
    if (status === "error") setStatus("input");
  };

  const goBack = () => {
    clearIdentityMethod();
    navigate({ to: "/identity" });
  };

  const handleFindRecord = async () => {
    if (!isExact14) {
      setErrorMessage(t("identityAbhaValidation"));
      return;
    }

    setStatus("fetching");
    setErrorMessage(null);

    try {
      const result = await api.patients.identify({ method: "abha", value: abhaNumber });
      if (!result?.id) {
        throw new Error("No patient id returned");
      }
      const patientRecord: Patient = {
        id: result.id,
        name: result.name || "Ramesh Kumar",
        age: result.age || 52,
        sex: result.gender || "Male",
        uhid: result.patient_code || result.id,
        route: "abha",
      };
      setPatient(patientRecord);
      setFoundPatient(patientRecord);
      setStatus("found");
    } catch (err) {
      console.error("ABHA lookup error:", err);
      setStatus("error");
      setErrorMessage(t("identityAbhaNotFound"));
    }
  };

  if (status === "fetching") {
    return (
      <KioskShell step="identity">
        <PageHeading
          title={t("identityFindRecordTitle")}
          subtitle={t("identityFindRecordSubtitle")}
        />
        <div className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-12 text-center shadow-card">
          <Loader2 className="mx-auto size-20 animate-spin text-primary" />
          <h2 className="mt-6 text-4xl font-extrabold">{t("identityFetching")}</h2>
          <p className="mt-3 text-xl text-muted-foreground">Verifying ABHA: {abhaNumber}</p>
        </div>
      </KioskShell>
    );
  }

  if (status === "found" && foundPatient) {
    return (
      <KioskShell step="identity">
        <PageHeading
          title={t("identityFindRecordTitle")}
          subtitle={t("identityFindRecordSubtitle")}
        />
        <div className="mx-auto max-w-3xl rounded-4xl border-2 border-success bg-success-soft p-10 text-center shadow-card">
          <CheckCircle2 className="mx-auto size-20 text-success" />
          <h2 className="mt-6 text-5xl font-extrabold">{t("identityFoundRecord")}</h2>
          <p className="mt-4 text-3xl font-bold">{foundPatient.name}</p>
          <p className="mt-1 text-xl text-muted-foreground">
            {foundPatient.age} yrs · {foundPatient.sex} · UHID: {foundPatient.uhid}
          </p>
          <p className="mt-2 text-base font-semibold text-primary">ABHA: {abhaNumber}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate({ to: "/care" })}
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-3xl font-extrabold text-primary-foreground shadow-lift"
            >
              {t("identityUseRecord")} <ArrowRight className="size-8" />
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("input");
                setFoundPatient(null);
              }}
              className="inline-flex min-h-20 items-center gap-2 rounded-full border-2 border-border bg-card px-8 text-xl font-bold"
            >
              Try another number
            </button>
          </div>
        </div>
      </KioskShell>
    );
  }

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

        {/* 14-digit display / input */}
        <input
          value={abhaNumber}
          onChange={(event) => {
            const clean = event.target.value.replace(/\D/g, "").slice(0, 14);
            setAbhaNumber(clean);
            if (errorMessage) setErrorMessage(null);
          }}
          inputMode="numeric"
          maxLength={14}
          placeholder={t("identityAbhaPlaceholder")}
          aria-label={t("identityTypeAbha")}
          className="mt-7 w-full rounded-2xl border-2 border-primary bg-background p-5 text-center text-3xl tracking-[0.25em] font-mono"
        />

        {/* Digit count & validation indicator */}
        <div className="mt-2 flex items-center justify-between px-2 text-sm text-muted-foreground">
          <span>{abhaNumber.length} / 14 digits</span>
          {isExact14 ? (
            <span className="font-bold text-success">✓ 14 digits ready</span>
          ) : (
            <span>{14 - abhaNumber.length} digits remaining</span>
          )}
        </div>

        {/* Error message display - Strictly ABHA specific */}
        {errorMessage ? (
          <div className="mt-3 rounded-xl bg-destructive/10 p-3 text-center font-bold text-destructive">
            {errorMessage}
          </div>
        ) : abhaNumber.length > 0 && !isExact14 ? (
          <p className="mt-3 text-center font-semibold text-warning-foreground">
            {t("identityAbhaValidation")}
          </p>
        ) : null}

        {/* 
          Keypad layout per user requirement:
          1 2 3
          4 5 6
          7 8 9
          Clear 0 Backspace
        */}
        <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-md sm:mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => append(digit)}
              className="min-h-16 rounded-2xl border-2 border-border bg-card text-2xl font-bold active:scale-[0.98]"
            >
              {digit}
            </button>
          ))}

          {/* Row 4: Clear, 0, Backspace */}
          <button
            type="button"
            onClick={clear}
            className="min-h-16 rounded-2xl border-2 border-border bg-card text-lg font-bold text-muted-foreground active:scale-[0.98]"
          >
            {t("identityClear")}
          </button>
          <button
            type="button"
            onClick={() => append("0")}
            className="min-h-16 rounded-2xl border-2 border-border bg-card text-2xl font-bold active:scale-[0.98]"
          >
            0
          </button>
          <button
            type="button"
            onClick={backspace}
            aria-label={t("identityBackspace")}
            className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card text-lg font-bold text-muted-foreground active:scale-[0.98]"
          >
            <Delete className="size-5" />
            {t("identityBackspace")}
          </button>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={handleFindRecord}
            disabled={!isExact14}
            className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground disabled:opacity-40 disabled:pointer-events-none shadow-lift"
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
