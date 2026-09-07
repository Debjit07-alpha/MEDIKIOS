import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Fingerprint, Loader2 } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { ListenButton } from "@/components/kiosk/ListenButton";
import { IdentityResult } from "@/components/kiosk/IdentityResult";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/identity/aadhaar/scan")({ component: AadhaarScanPage });

function AadhaarScanPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clearIdentityMethod } = useKiosk();
  const [scanning, setScanning] = useState(false);
  const [successful, setSuccessful] = useState(false);

  if (successful) {
    return (
      <IdentityResult
        autoStart
        method="aadhaar"
        submit={() => api.patients.identify({ method: "aadhaar", value: "fingerprint_demo" })}
      />
    );
  }

  const goBack = () => {
    clearIdentityMethod();
    navigate({ to: "/identity" });
  };

  const startScan = () => {
    setScanning(true);
    window.setTimeout(() => setScanning(false), 2200);
  };

  return (
    <KioskShell step="identity">
      <PageHeading title={t("identityAadhaarTitle")} subtitle={t("identityAadhaarSubtitle")} />
      <div className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-10 text-center shadow-card">
        <span className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-5 py-2 text-lg font-bold text-warning-foreground">
          <Fingerprint className="size-5" /> {t("identityDemoScanner")}
        </span>
        <div className="mx-auto mt-7 grid size-36 place-items-center rounded-4xl bg-accent text-primary">
          {scanning ? (
            <Loader2 className="size-24 animate-spin" />
          ) : successful ? (
            <CheckCircle2 className="size-24" />
          ) : (
            <Fingerprint className="size-24" />
          )}
        </div>
        <h2 className="mt-7 text-4xl font-extrabold">
          {scanning ? t("identityScanning") : t("identityReadyToScan")}
        </h2>
        <p className="mt-3 text-xl text-muted-foreground">
          {scanning ? t("identityKeepFinger") : t("identityScanInstruction")}
        </p>
        <div className="mt-6">
          <ListenButton text={`${t("identityScanning")}. ${t("identityKeepFinger")}`} />
        </div>
        {scanning ? (
          <div className="mx-auto mt-7 h-3 max-w-lg overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
          </div>
        ) : null}
        {!scanning ? (
          <button
            type="button"
            onClick={startScan}
            className="mt-8 min-h-20 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground"
          >
            {t("identityStartScan")}
          </button>
        ) : null}
        {!scanning && !successful ? (
          <button
            type="button"
            onClick={() => setSuccessful(true)}
            className="mt-5 block mx-auto min-h-16 rounded-full border-2 border-primary bg-primary-soft px-8 text-xl font-bold text-primary"
          >
            {t("identitySimulateSuccess")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={goBack}
          className="mt-5 block mx-auto min-h-16 rounded-full border-2 border-border bg-card px-8 text-xl font-bold"
        >
          {t("back")}
        </button>
      </div>
    </KioskShell>
  );
}
