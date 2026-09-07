import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { IdentityResult } from "@/components/kiosk/IdentityResult";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/identity/new-patient/form")({
  component: NewPatientFormPage,
});

function NewPatientFormPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clearIdentityMethod } = useKiosk();
  const [form, setForm] = useState({ name: "", age: "", mobile: "", address: "", gender: "" });
  const [submitted, setSubmitted] = useState(false);
  const update = (key: keyof typeof form, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const valid =
    form.name.trim().length >= 2 &&
    Number(form.age) > 0 &&
    form.mobile.replace(/\D/g, "").length === 10 &&
    form.gender !== "" &&
    form.address.trim().length >= 5;
  const goBack = () => {
    clearIdentityMethod();
    navigate({ to: "/identity" });
  };

  if (submitted) {
    return (
      <IdentityResult
        autoStart
        method="new"
        submit={() =>
          api.patients.create({
            name: form.name.trim(),
            age: Number(form.age),
            gender: form.gender,
          })
        }
      />
    );
  }

  return (
    <KioskShell step="identity">
      <PageHeading title={t("identityNewTitle")} subtitle={t("identityNewSubtitle")} />
      <div className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-8 shadow-card sm:p-10">
        <div className="grid gap-5">
          <label className="grid gap-2 text-lg font-bold">
            {t("identityName")}
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={t("identityNamePlaceholder")}
              className="min-h-16 rounded-2xl border-2 border-border bg-background p-4 text-xl"
            />
          </label>
          <label className="grid gap-2 text-lg font-bold">
            {t("identityAge")}
            <input
              value={form.age}
              onChange={(e) => update("age", e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              placeholder={t("identityAgePlaceholder")}
              className="min-h-16 rounded-2xl border-2 border-border bg-background p-4 text-xl"
            />
          </label>
          <label className="grid gap-2 text-lg font-bold">
            {t("identityMobile")}
            <input
              value={form.mobile}
              onChange={(e) => update("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="tel"
              placeholder={t("identityMobilePlaceholder")}
              className="min-h-16 rounded-2xl border-2 border-border bg-background p-4 text-xl"
            />
          </label>
          <label className="grid gap-2 text-lg font-bold">{t("identityGender")}</label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["male", "identityMale"],
                ["female", "identityFemale"],
                ["other", "identityOther"],
              ] as const
            ).map(([value, key]) => (
              <button
                key={value}
                type="button"
                onClick={() => update("gender", value)}
                className={`min-h-16 rounded-2xl border-2 text-xl font-bold ${form.gender === value ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
              >
                {t(key as "identityMale" | "identityFemale" | "identityOther")}
              </button>
            ))}
          </div>
          <label className="grid gap-2 text-lg font-bold">
            {t("identityAddress")}
            <textarea
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder={t("identityAddressPlaceholder")}
              rows={3}
              className="rounded-2xl border-2 border-border bg-background p-4 text-xl"
            />
          </label>
          {!valid ? (
            <p className="font-semibold text-destructive">{t("identityRequired")}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              disabled={!valid}
              onClick={() => setSubmitted(true)}
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground disabled:opacity-40"
            >
              {t("identityCreateRecord")} <ArrowRight className="size-7" />
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
      </div>
    </KioskShell>
  );
}
