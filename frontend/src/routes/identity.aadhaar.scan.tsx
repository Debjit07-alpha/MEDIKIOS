import { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Fingerprint, Loader2 } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";
import type { Patient } from "@/lib/kiosk-store";

export const Route = createFileRoute("/identity/aadhaar/scan")({ component: AadhaarScanPage });

function AadhaarScanPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setPatient, clearIdentityMethod } = useKiosk();

  const [status, setStatus] = useState<"ready" | "scanning" | "fetching" | "found" | "error">("ready");
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scanTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
    };
  }, []);

  const goBack = () => {
    if (scanTimer.current) window.clearTimeout(scanTimer.current);
    clearIdentityMethod();
    navigate({ to: "/identity/aadhaar" });
  };

  const handleStartScan = () => {
    setStatus("scanning");
    setErrorMessage(null);

    // Simulate realistic hardware biometric capture (2.5 seconds)
    scanTimer.current = window.setTimeout(async () => {
      setStatus("fetching");

      try {
        const result = await api.patients.identify({
          method: "aadhaar",
          value: "demo_biometric_thumb",
        });

        const patientRecord: Patient = {
          name: result.name || "Sunita Devi (Demo)",
          age: result.age || 58,
          sex: result.gender || "Female",
          uhid: result.id || "DGH/2026/8421",
          route: "aadhaar",
        };

        setPatient(patientRecord);
        setFoundPatient(patientRecord);
        setStatus("found");
      } catch (err) {
        console.error("Aadhaar biometric lookup error:", err);
        setStatus("error");
        setErrorMessage(t("identityAadhaarNotFound"));
      }
    }, 2500);
  };

  if (status === "found" && foundPatient) {
    return (
      <KioskShell step="identity">
        <PageHeading
          title={t("identityAadhaarTitle")}
          subtitle={t("identityAadhaarSubtitle")}
        />
        <div className="mx-auto max-w-3xl rounded-4xl border-2 border-success bg-success-soft p-10 text-center shadow-card">
          <CheckCircle2 className="mx-auto size-20 text-success" />
          <div className="mt-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-success/15 px-4 py-1.5 text-sm font-bold text-success">
              ✓ {t("identityDemoBiometric")}
            </span>
          </div>
          <h2 className="mt-4 text-5xl font-extrabold">{t("identityFoundRecord")}</h2>
          <p className="mt-4 text-3xl font-bold">{foundPatient.name}</p>
          <p className="mt-1 text-xl text-muted-foreground">
            {foundPatient.age} yrs · {foundPatient.sex} · UHID: {foundPatient.uhid}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Aadhaar verified securely for OPD Block A
          </p>

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
                setStatus("ready");
                setFoundPatient(null);
              }}
              className="inline-flex min-h-20 items-center gap-2 rounded-full border-2 border-border bg-card px-8 text-xl font-bold"
            >
              Scan again
            </button>
          </div>
        </div>
      </KioskShell>
    );
  }

  return (
    <KioskShell step="identity">
      <PageHeading title={t("identityAadhaarTitle")} subtitle={t("identityAadhaarSubtitle")} />

      <div className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-8 text-center shadow-card sm:p-10">
        {/* Prominent Demo Mode label */}
        <span className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-5 py-2 text-base font-bold text-warning-foreground">
          <Fingerprint className="size-5" /> {t("identityDemoBiometric")}
        </span>

        {/* Central visual indicator */}
        <div className="mx-auto mt-7 grid size-36 place-items-center rounded-4xl bg-accent text-primary">
          {status === "scanning" || status === "fetching" ? (
            <Loader2 className="size-24 animate-spin" />
          ) : (
            <Fingerprint className="size-24" />
          )}
        </div>

        {/* Status text */}
        <h2 className="mt-7 text-4xl font-extrabold">
          {status === "scanning"
            ? t("identityScanning")
            : status === "fetching"
              ? t("identityFetching")
              : t("identityReadyToScan")}
        </h2>

        <p className="mt-3 text-xl text-muted-foreground">
          {status === "scanning"
            ? t("identityKeepFinger")
            : status === "fetching"
              ? "Verifying biometric fingerprint with hospital database..."
              : t("identityScanInstruction")}
        </p>

        {/* Audio guidance button */}
        <div className="mt-6">
          <ListenButton
            text={
              status === "scanning"
                ? `${t("identityScanning")}. ${t("identityKeepFinger")}`
                : `${t("identityReadyToScan")}. ${t("identityScanInstruction")}`
            }
          />
        </div>

        {/* Scanning progress animation */}
        {status === "scanning" ? (
          <div className="mx-auto mt-7 h-3 max-w-lg overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full animate-pulse rounded-full bg-primary" />
          </div>
        ) : null}

        {/* Error message */}
        {errorMessage ? (
          <div className="mx-auto mt-5 max-w-md rounded-2xl bg-destructive/10 p-4 font-bold text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {status === "ready" || status === "error" ? (
            <button
              type="button"
              onClick={handleStartScan}
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground shadow-lift active:scale-[0.99]"
            >
              {t("identityStartScan")} <ArrowRight className="size-7" />
            </button>
          ) : null}

          {status !== "scanning" && status !== "fetching" ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex min-h-20 items-center gap-2 rounded-full border-2 border-border bg-card px-10 text-2xl font-bold active:scale-[0.99]"
            >
              <ArrowLeft className="size-6" />
              {t("back")}
            </button>
          ) : null}
        </div>
      </div>
    </KioskShell>
  );
}
