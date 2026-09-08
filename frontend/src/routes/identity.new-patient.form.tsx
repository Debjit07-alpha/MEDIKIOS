import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, UserRoundPlus } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { api } from "@/lib/api";
import type { Patient } from "@/lib/kiosk-store";

export const Route = createFileRoute("/identity/new-patient/form")({
  component: NewPatientFormPage,
});

function NewPatientFormPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setPatient, clearIdentityMethod } = useKiosk();

  const [form, setForm] = useState({
    name: "",
    age: "",
    dob: "",
    gender: "",
    mobile: "",
    address: "",
  });

  const [submittedAttempt, setSubmittedAttempt] = useState(false);
  const [status, setStatus] = useState<"form" | "creating" | "confirmed">("form");
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (apiError) setApiError(null);
  };

  const isNameValid = form.name.trim().length >= 2;
  const isAgeValid = Number(form.age) > 0 && Number(form.age) <= 125;
  const isGenderValid = form.gender !== "";
  const isMobileValid = form.mobile.replace(/\D/g, "").length === 10;
  const isAddressValid = form.address.trim().length >= 5;

  const isFormComplete =
    isNameValid && isAgeValid && isGenderValid && isMobileValid && isAddressValid;

  const getValidationErrors = () => {
    const errors: string[] = [];
    if (!isNameValid) errors.push(t("identityNameValidation"));
    if (!isAgeValid) errors.push(t("identityAgeValidation"));
    if (!isGenderValid) errors.push(t("identityGenderValidation"));
    if (!isMobileValid) errors.push(t("identityMobileValidation"));
    if (!isAddressValid) errors.push(t("identityAddressValidation"));
    return errors;
  };

  const goBack = () => {
    clearIdentityMethod();
    navigate({ to: "/identity/new-patient" });
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSubmittedAttempt(true);

    if (!isFormComplete) {
      return;
    }

    setStatus("creating");
    setApiError(null);

    try {
      const created = await api.patients.create({
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender === "male" ? "Male" : form.gender === "female" ? "Female" : "Other",
      });

      const patientRecord: Patient = {
        name: created.name || form.name.trim(),
        age: created.age || Number(form.age),
        sex: created.gender || (form.gender === "male" ? "Male" : form.gender === "female" ? "Female" : "Other"),
        uhid: created.id || `DGH/2026/${Math.floor(1000 + Math.random() * 9000)}`,
        route: "new",
      };

      setPatient(patientRecord);
      setCreatedPatient(patientRecord);
      setStatus("confirmed");
    } catch (err) {
      console.error("New patient creation error:", err);
      // Inline patient error, NEVER an OCR error!
      setApiError("Could not create patient record. Please check your details and try again.");
      setStatus("form");
    }
  };

  if (status === "creating") {
    return (
      <KioskShell step="identity">
        <PageHeading
          title={t("identityNewTitle")}
          subtitle={t("identityNewSubtitle")}
        />
        <div className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-12 text-center shadow-card">
          <Loader2 className="mx-auto size-20 animate-spin text-primary" />
          <h2 className="mt-6 text-4xl font-extrabold">Creating your new patient record...</h2>
          <p className="mt-3 text-xl text-muted-foreground">
            Please wait while MediKiosk registers your hospital intake.
          </p>
        </div>
      </KioskShell>
    );
  }

  if (status === "confirmed" && createdPatient) {
    return (
      <KioskShell step="identity">
        <PageHeading
          title={t("identityNewTitle")}
          subtitle={t("identityNewSubtitle")}
        />
        <div className="mx-auto max-w-3xl rounded-4xl border-2 border-success bg-success-soft p-10 text-center shadow-card">
          <CheckCircle2 className="mx-auto size-20 text-success" />
          <h2 className="mt-6 text-5xl font-extrabold">{t("identityNewCreated")}</h2>
          <p className="mt-4 text-3xl font-bold">{createdPatient.name}</p>
          <p className="mt-1 text-xl text-muted-foreground">
            {createdPatient.age} yrs · {createdPatient.sex} · UHID: {createdPatient.uhid}
          </p>
          <p className="mt-2 text-base text-muted-foreground">
            Mobile: +91 {form.mobile} · OPD Block A
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate({ to: "/care" })}
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-3xl font-extrabold text-primary-foreground shadow-lift"
            >
              {t("identityContinueToCare")} <ArrowRight className="size-8" />
            </button>
            <button
              type="button"
              onClick={() => setStatus("form")}
              className="inline-flex min-h-20 items-center gap-2 rounded-full border-2 border-border bg-card px-8 text-xl font-bold"
            >
              Review details
            </button>
          </div>
        </div>
      </KioskShell>
    );
  }

  const validationErrors = submittedAttempt ? getValidationErrors() : [];

  return (
    <KioskShell step="identity">
      <PageHeading title={t("identityNewTitle")} subtitle={t("identityNewSubtitle")} />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-8 shadow-card sm:p-10"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <UserRoundPlus className="size-7" />
          </span>
          <div>
            <h2 className="text-2xl font-extrabold">{t("identityCreateRecord")}</h2>
            <p className="text-sm text-muted-foreground">
              Please enter your personal details accurately for hospital records.
            </p>
          </div>
        </div>

        {apiError ? (
          <div className="mb-6 rounded-2xl bg-destructive/10 p-4 font-bold text-destructive">
            {apiError}
          </div>
        ) : null}

        <div className="grid gap-6">
          {/* Full Name */}
          <label className="grid gap-2 text-lg font-bold">
            <span>
              {t("identityName")} <span className="text-destructive">*</span>
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={t("identityNamePlaceholder")}
              className={`min-h-16 rounded-2xl border-2 bg-background p-4 text-xl ${
                submittedAttempt && !isNameValid ? "border-destructive ring-1 ring-destructive" : "border-border"
              }`}
            />
            {submittedAttempt && !isNameValid ? (
              <span className="text-sm font-semibold text-destructive">
                {t("identityNameValidation")}
              </span>
            ) : null}
          </label>

          {/* Age and Optional DOB */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-lg font-bold">
              <span>
                {t("identityAge")} <span className="text-destructive">*</span>
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={form.age}
                onChange={(e) => update("age", e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder={t("identityAgePlaceholder")}
                className={`min-h-16 rounded-2xl border-2 bg-background p-4 text-xl ${
                  submittedAttempt && !isAgeValid ? "border-destructive ring-1 ring-destructive" : "border-border"
                }`}
              />
              {submittedAttempt && !isAgeValid ? (
                <span className="text-sm font-semibold text-destructive">
                  {t("identityAgeValidation")}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-lg font-bold">
              <span>Date of birth (optional)</span>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => update("dob", e.target.value)}
                className="min-h-16 rounded-2xl border-2 border-border bg-background p-4 text-xl"
              />
            </label>
          </div>

          {/* Gender */}
          <div className="grid gap-2 text-lg font-bold">
            <span>
              {t("identityGender")} <span className="text-destructive">*</span>
            </span>
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
                  className={`min-h-16 rounded-2xl border-2 text-xl font-bold transition-colors ${
                    form.gender === value
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  {t(key as "identityMale" | "identityFemale" | "identityOther")}
                </button>
              ))}
            </div>
            {submittedAttempt && !isGenderValid ? (
              <span className="text-sm font-semibold text-destructive">
                {t("identityGenderValidation")}
              </span>
            ) : null}
          </div>

          {/* Mobile Number */}
          <label className="grid gap-2 text-lg font-bold">
            <span>
              {t("identityMobile")} (10 digits) <span className="text-destructive">*</span>
            </span>
            <input
              type="tel"
              inputMode="tel"
              value={form.mobile}
              onChange={(e) => update("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder={t("identityMobilePlaceholder")}
              className={`min-h-16 rounded-2xl border-2 bg-background p-4 text-xl ${
                submittedAttempt && !isMobileValid ? "border-destructive ring-1 ring-destructive" : "border-border"
              }`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Must be a valid 10-digit Indian mobile number</span>
              <span>{form.mobile.length} / 10 digits</span>
            </div>
            {submittedAttempt && !isMobileValid ? (
              <span className="text-sm font-semibold text-destructive">
                {t("identityMobileValidation")}
              </span>
            ) : null}
          </label>

          {/* Address */}
          <label className="grid gap-2 text-lg font-bold">
            <span>
              {t("identityAddress")} <span className="text-destructive">*</span>
            </span>
            <textarea
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder={t("identityAddressPlaceholder")}
              rows={3}
              className={`rounded-2xl border-2 bg-background p-4 text-xl ${
                submittedAttempt && !isAddressValid ? "border-destructive ring-1 ring-destructive" : "border-border"
              }`}
            />
            {submittedAttempt && !isAddressValid ? (
              <span className="text-sm font-semibold text-destructive">
                {t("identityAddressValidation")}
              </span>
            ) : null}
          </label>

          {/* Overall Validation Alert */}
          {submittedAttempt && validationErrors.length > 0 ? (
            <div className="rounded-2xl bg-destructive/10 p-4 text-destructive font-bold">
              <p className="mb-1">{t("identityRequired")}</p>
              <ul className="list-disc pl-5 text-sm font-normal">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <button
              type="submit"
              disabled={submittedAttempt && !isFormComplete}
              className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground shadow-lift disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99]"
            >
              {t("identityCreateRecord")} <ArrowRight className="size-7" />
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
        </div>
      </form>
    </KioskShell>
  );
}
