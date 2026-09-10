import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  IdCard,
  Loader2,
  Lock,
  UserRoundPlus,
} from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";
import { isLanguageCode } from "@/lib/kiosk-data";
import type { Patient } from "@/lib/kiosk-store";

export const Route = createFileRoute("/identity/login")({
  component: PatientLoginPage,
});

function PatientLoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setPatient, setLanguage } = useKiosk();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"form" | "signing-in" | "welcomed">("form");
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<Patient | null>(null);

  const goBack = () => {
    navigate({ to: "/identity/registration" });
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const id = loginId.trim();
    if (!id || !password) {
      setError(t("loginMissing"));
      return;
    }

    setStatus("signing-in");

    try {
      const result = await api.patients.login({ loginId: id, password });

      if (!result?.success || !result?.patient?.id) {
        throw new Error(t("loginInvalid"));
      }

      const p = result.patient;
      const patientRecord: Patient = {
        id: p.id,
        name: p.name?.trim() || "Patient",
        age: typeof p.age === "number" ? p.age : 0,
        sex: p.gender || "Not stated",
        uhid: p.patientCode || p.id,
        route: "new",
      };

      setPatient(patientRecord);
      if (p.preferredLanguage && isLanguageCode(p.preferredLanguage)) {
        setLanguage(p.preferredLanguage);
      }
      setSignedIn(patientRecord);
      setStatus("welcomed");
    } catch {
      setError(t("loginInvalid"));
      setStatus("form");
    }
  };

  if (status === "signing-in") {
    return (
      <KioskShell step="identity">
        <PageHeading title={t("loginTitle")} subtitle={t("loginSubtitle")} />
        <div className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-12 text-center shadow-card">
          <Loader2 className="mx-auto size-20 animate-spin text-primary" />
          <h2 className="mt-6 text-4xl font-extrabold">{t("loginSignIn")}...</h2>
          <p className="mt-3 text-xl text-muted-foreground">
            Please wait while we find your record.
          </p>
        </div>
      </KioskShell>
    );
  }

  if (status === "welcomed" && signedIn) {
    return (
      <KioskShell step="identity">
        <PageHeading title={t("loginTitle")} subtitle={t("loginSubtitle")} />
        <div className="mx-auto max-w-3xl rounded-4xl border-2 border-success bg-success-soft p-10 text-center shadow-card">
          <CheckCircle2 className="mx-auto size-20 text-success" />
          <h2 className="mt-6 text-5xl font-extrabold">
            {t("loginWelcomeBack")}, {signedIn.name}
          </h2>
          <p className="mt-4 text-2xl font-bold">Patient ID: {signedIn.uhid}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate({ to: "/care" })}
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-3xl font-extrabold text-primary-foreground shadow-lift"
            >
              {t("loginContinue")} <ArrowRight className="size-8" />
            </button>
          </div>
        </div>
      </KioskShell>
    );
  }

  return (
    <KioskShell step="identity">
      <PageHeading title={t("loginTitle")} subtitle={t("loginSubtitle")} />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-8 shadow-card sm:p-10"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <IdCard className="size-7" />
          </span>
          <div>
            <h2 className="text-2xl font-extrabold">{t("loginTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-2xl bg-destructive/10 p-4 text-xl font-bold text-destructive"
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-6">
          <label className="grid gap-2 text-lg font-bold">
            <span>
              {t("loginIdLabel")} <span className="text-destructive">*</span>
            </span>
            <input
              type="text"
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t("loginIdPlaceholder")}
              autoComplete="username"
              className="min-h-16 rounded-2xl border-2 border-border bg-background p-4 text-xl"
            />
          </label>

          <label className="grid gap-2 text-lg font-bold">
            <span>
              {t("loginPasswordLabel")} <span className="text-destructive">*</span>
            </span>
            <span className="relative grid">
              <Lock className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t("loginPasswordPlaceholder")}
                autoComplete="current-password"
                className="min-h-16 rounded-2xl border-2 border-border bg-background p-4 pl-12 text-xl"
              />
            </span>
          </label>

          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <button
              type="submit"
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground shadow-lift active:scale-[0.99]"
            >
              {t("loginSignIn")} <ArrowRight className="size-7" />
            </button>
            <button
              type="button"
              onClick={goBack}
              className="inline-flex min-h-20 items-center gap-2 rounded-full border-2 border-border bg-card px-10 text-2xl font-bold active:scale-[0.99]"
            >
              <ArrowLeft className="size-6" />
              {t("back")}
            </button>
          </div>

          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => navigate({ to: "/identity/new-patient/form" })}
              className="inline-flex min-h-14 items-center gap-2 rounded-full px-6 text-xl font-extrabold text-primary underline-offset-4 hover:underline"
            >
              <UserRoundPlus className="size-6" /> {t("loginNewPatient")}
            </button>
          </div>
        </div>
      </form>
    </KioskShell>
  );
}
