import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { KioskShell } from "./KioskShell";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import type { Patient } from "@/lib/kiosk-store";
import type { Patient as ApiPatient } from "@/lib/api";

type Props = {
  method: Patient["route"];
  submit: () => Promise<ApiPatient>;
  autoStart?: boolean;
};

export function IdentityResult({ method, submit, autoStart = false }: Props) {
  const { setPatient } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const started = useRef(false);
  const [status, setStatus] = useState<"idle" | "fetching" | "found" | "error">("idle");
  const [patient, setFoundPatient] = useState<Patient | null>(null);

  const findRecord = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    setStatus("fetching");
    try {
      const result = await submit();
      const formatted = {
        name: result.name,
        age: result.age,
        sex: result.gender || "Other",
        uhid: result.id,
        route: method,
      } satisfies Patient;
      setPatient(formatted);
      setFoundPatient(formatted);
      setStatus("found");
    } catch (error) {
      console.error("Identity verification failed", error);
      started.current = false;
      setStatus("error");
    }
  }, [method, setPatient, submit]);

  useEffect(() => {
    if (autoStart) void findRecord();
  }, [autoStart, findRecord]);

  return (
    <KioskShell step="identity">
      {status === "fetching" ? (
        <div className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-12 text-center shadow-card">
          <Loader2 className="mx-auto size-20 animate-spin text-primary" />
          <h1 className="mt-6 text-4xl font-extrabold">{t("identityFetching")}</h1>
        </div>
      ) : status === "found" && patient ? (
        <div className="mx-auto max-w-3xl rounded-4xl border-2 border-success bg-success-soft p-10 text-center shadow-card">
          <CheckCircle2 className="mx-auto size-20 text-success" />
          <h1 className="mt-6 text-5xl">{t("identityFoundRecord")}</h1>
          <p className="mt-4 text-2xl font-bold">{patient.name}</p>
          <p className="text-lg text-muted-foreground">
            {patient.age} yrs · {patient.sex} · {patient.uhid}
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/care" })}
            className="mt-8 inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-3xl font-extrabold text-primary-foreground shadow-lift"
          >
            {t("identityUseRecord")} <ArrowRight className="size-8" />
          </button>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-10 text-center shadow-card">
          <h1 className="text-4xl font-extrabold">{t("identityFindRecordTitle")}</h1>
          {status === "error" ? (
            <p className="mt-4 rounded-xl bg-destructive/10 p-4 font-bold text-destructive">
              {t("documentError")}
            </p>
          ) : null}
          <button
            type="button"
            onClick={findRecord}
            className="mt-8 inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground"
          >
            {t("identityFindMyRecord")} <ArrowRight className="size-7" />
          </button>
        </div>
      )}
    </KioskShell>
  );
}
