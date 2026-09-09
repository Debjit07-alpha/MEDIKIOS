import { questionsForMode, type CareMode, type LanguageCode } from "./kiosk-data";
import { localizeQuestion } from "./question-i18n";

export type SummaryRow = {
  /** Question id this row came from (helps doctor-summary assembly). */
  qid?: string;
  section: string;
  field: string;
  label: string;
  value: string;
};

/**
 * Build the human-readable summary rows for a care mode from the patient's
 * answers. Pure and language-neutral: pass `language` = the patient's language
 * for the patient-facing summary, or "en" for the doctor summary.
 */
export function buildSummary(
  mode: CareMode,
  answers: Record<string, string[]>,
  fallback = "Not answered",
  language: LanguageCode = "en",
): SummaryRow[] {
  return questionsForMode(mode)
    .filter((q) => (q.showIf ? q.showIf(answers) : true))
    .map((q) => {
      const picked = answers[q.id] ?? [];
      const localized = localizeQuestion(q, language);
      const labels = new Map(localized.options.map((o) => [o.id, o.label]));
      const value = picked.length ? picked.map((id) => labels.get(id) ?? id).join(", ") : fallback;
      return {
        qid: q.id,
        section: localized.section,
        field: q.field,
        label: localized.fieldLabel,
        value,
      };
    });
}

/**
 * Build English-resolved summary rows for the doctor summary payload.
 * Always uses language="en" regardless of the patient's selected language.
 * This produces the `doctorSummaryRows` the backend needs for section grouping.
 */
export function buildEnglishSummaryRows(
  mode: CareMode,
  answers: Record<string, string[]>,
): SummaryRow[] {
  return buildSummary(mode, answers, "Not answered", "en");
}
