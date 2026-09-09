/**
 * Universal Doctor Summary engine.
 *
 * One function, `generateDoctorEnglishSummary(patientData)`, converts a
 * patient's kiosk data in ANY supported language into a clinically organized
 * ENGLISH summary. There is deliberately no language-specific branch anywhere
 * in this file: the source language is read from `patientData.patientLanguage`
 * and the output language is always English (`doctorSummary.language === "en"`).
 *
 * The deterministic assembler is the authority and preserves:
 *  - original patient answers (stored separately, never modified)
 *  - negation ("No, never", "None of these")
 *  - numbers / doses / investigation values / reference ranges
 *  - free-form voice transcripts (kept verbatim, translated by AI when available)
 *
 * AI (OpenAI) is an optional enhancer used only where it is safe:
 *  1. Faithful English translation of free-form voice answers.
 *  2. A short "Key Points" list drawn strictly from the deterministic facts.
 * If AI is unavailable or fails, the deterministic summary stands.
 */

export type CareMode = "allopathy" | "ayush";

export type SummaryRow = {
  qid?: string;
  section: string;
  field: string;
  label: string;
  value: string;
};

export type DoctorSummarySectionItem = {
  label: string;
  value: string;
  /** Question id, present on free-form items so AI translations can be merged. */
  qid?: string;
  /** True when the value is the patient's own words, preserved verbatim. */
  verbatim?: boolean;
};

export type DoctorSummarySection = {
  title: string;
  items: DoctorSummarySectionItem[];
};

export type DoctorSummaryContent = {
  /** The patient's selected language — provenance only, never the output language. */
  patientLanguage: string;
  careMode: CareMode;
  patient: {
    name: string;
    age: number;
    sex: string;
    uhid: string;
  } | null;
  sections: DoctorSummarySection[];
  text: string;
  generatedBy: "deterministic" | "ai";
};

export type ShareSummaryDocument = {
  id: string;
  kind: string;
  kindLabel: string;
  title: string;
  facility: string;
  date: string;
  diagnoses: string[];
  diagnosis?: string;
  medications?: { name: string; dose: string; schedule: string; duration: string }[];
  values?: { name: string; value: string; unit: string; normal: string; abnormal: boolean }[];
  note?: string;
};

export type PatientDoctorSummaryPayload = {
  patientId: string;
  /** Source language selected by the patient (en | hi | mr | bn | ta | te | kn | gu | ...). */
  patientLanguage: string;
  careMode: CareMode;
  patient: { name: string; age: number; sex: string; uhid: string } | null;
  /** Question-option answers: values are arrays of option ids (language independent). */
  answers: Record<string, string[]>;
  /** Free-form voice transcripts, preserved verbatim. */
  voiceAnswers: Record<string, string>;
  documents: ShareSummaryDocument[];
  redFlag: { label: string; detail: string; at: string } | null;
  /** English-resolved summary rows (frontend maps option ids to canonical English labels). */
  doctorSummaryRows: SummaryRow[];
  shareScope: "abha" | "hospital";
};

export const DOCTOR_SUMMARY_QUESTION_ID = "__doctor_summary__";
export const PATIENT_SUMMARY_QUESTION_ID = "__patient_summary__";
export const DOCTOR_SUMMARY_RESPONSE_TYPE = "doctor_summary";
export const PATIENT_SUMMARY_RESPONSE_TYPE = "patient_summary";

const DOCTOR_TITLE = "PATIENT HISTORY SUMMARY";

const LANGUAGE_NAMES: Record<string, string> = {
  as: "Assamese",
  bn: "Bengali",
  brx: "Bodo",
  doi: "Dogri",
  en: "English",
  gu: "Gujarati",
  hi: "Hindi",
  kn: "Kannada",
  ks: "Kashmiri",
  kok: "Konkani",
  mai: "Maithili",
  ml: "Malayalam",
  mni: "Manipuri",
  mr: "Marathi",
  ne: "Nepali",
  or: "Odia",
  pa: "Punjabi",
  sa: "Sanskrit",
  sat: "Santali",
  sd: "Sindhi",
  ta: "Tamil",
  te: "Telugu",
  ur: "Urdu",
};

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

const NOT_ANSWERED = "Not answered";

function answeredQuestionIds(answers: Record<string, string[]>): Set<string> {
  return new Set(
    Object.entries(answers)
      .filter(([, values]) => Array.isArray(values) && values.length > 0)
      .map(([id]) => id),
  );
}

/** Group English-resolved answer rows into medical sections, in the order asked. */
function buildInterviewSections(
  answers: Record<string, string[]>,
  doctorSummaryRows: SummaryRow[],
): DoctorSummarySection[] {
  const answered = answeredQuestionIds(answers);
  const sections: DoctorSummarySection[] = [];
  const byTitle = new Map<string, DoctorSummarySection>();

  for (const row of doctorSummaryRows) {
    const answeredRow =
      Boolean(row.qid && answered.has(row.qid)) ||
      (!row.qid && Boolean(row.value) && row.value !== NOT_ANSWERED);
    if (!answeredRow) continue;

    const title = row.section.trim() || "Additional Patient Concerns";
    let section = byTitle.get(title);
    if (!section) {
      section = { title, items: [] };
      byTitle.set(title, section);
      sections.push(section);
    }
    section.items.push({ label: row.label, value: row.value });
  }

  return sections;
}

function buildVoiceAnswersSection(
  doctorSummaryRows: SummaryRow[],
  voiceAnswers: Record<string, string>,
  patientLanguage: string,
): DoctorSummarySection[] {
  const rowsByQid = new Map(doctorSummaryRows.filter((r) => r.qid).map((r) => [r.qid!, r]));
  const languageName = getLanguageName(patientLanguage);
  const extras: DoctorSummarySectionItem[] = [];

  for (const [qid, transcript] of Object.entries(voiceAnswers)) {
    const text = (transcript || "").trim();
    if (!text) continue;
    const row = rowsByQid.get(qid);
    extras.push({
      qid,
      label: row ? row.label : qid,
      value: text,
      verbatim: true,
    });
  }

  if (extras.length === 0) return [];
  return [
    {
      title: "Additional Patient Concerns (verbatim)",
      items: extras.map((item) => ({
        ...item,
        label: `${item.label} — patient's own words (${languageName})`,
      })),
    },
  ];
}

/**
 * Generate the English doctor summary for a patient whose data may be in any
 * supported language. Output language is ALWAYS English.
 */
export function generateDoctorEnglishSummary(
  patientData: PatientDoctorSummaryPayload,
): DoctorSummaryContent {
  const answers = patientData.answers || {};
  const doctorSummaryRows = patientData.doctorSummaryRows || [];

  const sections: DoctorSummarySection[] = [];

  // 1. Patient information (no identifiers such as ABHA / Aadhaar are included).
  if (patientData.patient) {
    const p = patientData.patient;
    sections.push({
      title: "Patient Information",
      items: [
        { label: "Name", value: p.name || "Not provided" },
        { label: "Age", value: String(p.age ?? "Not provided") },
        { label: "Sex", value: p.sex || "Not provided" },
        { label: "UHID / Patient ID", value: p.uhid || patientData.patientId || "Not provided" },
        { label: "Patient communication language", value: getLanguageName(patientData.patientLanguage) },
      ],
    });
  }

  sections.push(...buildInterviewSections(answers, doctorSummaryRows));

  // 2. Red flags / alerts (led by the alarm that stopped the interview).
  if (patientData.redFlag) {
    sections.push({
      title: "Red Flags / Alerts",
      items: [
        {
          label: patientData.redFlag.label || "Priority flag",
          value: patientData.redFlag.detail || "Red-flag sign selected during intake.",
        },
      ],
    });
  }

  // 3. Structured data derived from scanned documents. OCR output is preserved
  //    separately server-side; nothing here is inferred or invented.
  const documents = patientData.documents || [];
  const documentedDiagnoses: DoctorSummarySectionItem[] = [];
  const medications: DoctorSummarySectionItem[] = [];
  const investigations: DoctorSummarySectionItem[] = [];
  const documentNotes: DoctorSummarySectionItem[] = [];

  for (const doc of documents) {
    const source = `${doc.title || doc.kindLabel || "Document"}${doc.date ? ` (${doc.date})` : ""}`;
    if (doc.diagnoses && doc.diagnoses.length > 0) {
      for (const d of doc.diagnoses) documentedDiagnoses.push({ label: d, value: source });
    }
    if (doc.diagnosis) documentedDiagnoses.push({ label: doc.diagnosis, value: source });

    if (doc.medications && doc.medications.length > 0) {
      for (const med of doc.medications) {
        const parts: string[] = [];
        if (med.dose) parts.push(med.dose);
        else parts.push("Dosage: not provided");
        if (med.schedule) parts.push(med.schedule);
        if (med.duration) parts.push(med.duration);
        medications.push({
          label: med.name || "Medication (name not provided)",
          value: parts.join(", "),
        });
      }
    }

    if (doc.values && doc.values.length > 0) {
      for (const v of doc.values) {
        const valueText = [v.value, v.unit].filter(Boolean).join(" ");
        const normalText = v.normal ? ` (reference range: ${v.normal})` : "";
        investigations.push({ label: v.name || "Investigation", value: `${valueText}${normalText}` });
      }
    }

    if (doc.note && doc.note.trim()) documentNotes.push({ label: source, value: doc.note.trim() });
  }

  if (documentedDiagnoses.length > 0) {
    sections.push({ title: "Documented Diagnoses", items: documentedDiagnoses });
  } else if (documents.length > 0) {
    sections.push({
      title: "Documented Diagnoses",
      items: [{ label: "Status", value: "No diagnosis explicitly documented." }],
    });
  }

  if (medications.length > 0) {
    sections.push({ title: "Current Medications", items: medications });
  }
  if (investigations.length > 0) {
    sections.push({ title: "Investigations", items: investigations });
  }
  if (documentNotes.length > 0) {
    sections.push({ title: "Notes from Documents (as recorded)", items: documentNotes });
  }

  // 4. Free-form voice answers: original transcripts preserved verbatim.
  sections.push(...buildVoiceAnswersSection(doctorSummaryRows, patientData.voiceAnswers || {}, patientData.patientLanguage));

  const content: DoctorSummaryContent = {
    patientLanguage: patientData.patientLanguage,
    careMode: patientData.careMode,
    patient: patientData.patient || null,
    sections,
    text: "",
    generatedBy: "deterministic",
  };

  content.text = buildDoctorSummaryText(content);
  return content;
}

/** Render the structured summary as scan-ready plain text for printing/export. */
export function buildDoctorSummaryText(content: DoctorSummaryContent): string {
  const lines: string[] = [DOCTOR_TITLE, ""];
  if (content.patient) {
    const p = content.patient;
    lines.push(
      `Patient: ${p.name || "Not provided"} · ${p.age ?? "?"} y · ${p.sex || "Not provided"} · UHID: ${p.uhid || "Not provided"}`,
      `Communication language: ${getLanguageName(content.patientLanguage)}`,
      "",
    );
  }
  for (const section of content.sections) {
    lines.push(section.title.toUpperCase());
    for (const item of section.items) {
      lines.push(`  - ${item.label}${item.value ? `: ${item.value}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export type MinimalOpenAi = {
  chat: {
    completions: {
      create: (args: {
        model: string;
        messages: { role: string; content: string }[];
        response_format?: { type: "json_object" };
      }) => Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
};

/**
 * Optional AI enhancement covering:
 *  1. Faithful English translation of free-form voice answers (merged under the
 *     verbatim transcript, which is never replaced).
 *  2. A short, strictly fact-based "Key Points" list drawn from the
 *     deterministic sections.
 * If the model call fails or returns unusable JSON, the deterministic summary
 * stands unchanged.
 */
export async function enhanceWithAi(
  patientData: PatientDoctorSummaryPayload,
  openai: MinimalOpenAi,
): Promise<DoctorSummaryContent> {
  const base = generateDoctorEnglishSummary(patientData);
  const voiceEntries = Object.entries(patientData.voiceAnswers || {}).filter(([, v]) =>
    (v || "").trim(),
  );
  if (voiceEntries.length === 0) return base;

  const sourceLanguage = getLanguageName(patientData.patientLanguage);
  const context = {
    patientLanguageCode: patientData.patientLanguage,
    sourceLanguageName: sourceLanguage,
    voiceAnswers: Object.fromEntries(voiceEntries),
    baseSections: base.sections,
  };

  try {
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: [
            `SOURCE LANGUAGE: ${sourceLanguage} (code ${patientData.patientLanguage}).`,
            `OUTPUT LANGUAGE: English.`,
            `TASK: Create a faithful, clinically organized English summary of the information provided.`,
            `RULES:`,
            `- Do not invent facts.`,
            `- Do not diagnose.`,
            `- Do not infer disease from medication.`,
            `- Preserve negation.`,
            `- Preserve numbers.`,
            `- Preserve dosage.`,
            `- Preserve duration.`,
            `- Preserve body location.`,
            `- Preserve uncertainty.`,
            `- Preserve medical terminology.`,
            `- Include only information actually provided.`,
            `- Do not provide medical advice.`,
            `Return exactly this JSON structure:`,
            `{ "translations": [{ "questionId": string, "english": string }], "keyPoints": string[] }`,
            `"translations" maps every voice answer to a faithful English rendering of what the patient said.`,
            `"keyPoints" may list at most 5 short facts drawn ONLY from the provided base summary. If none, return [].`,
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(aiResponse.choices[0].message.content || "{}");
    const translations: Record<string, string> = {};
    if (Array.isArray(parsed.translations)) {
      for (const t of parsed.translations) {
        if (
          t &&
          typeof t.questionId === "string" &&
          typeof t.english === "string" &&
          t.english.trim()
        ) {
          translations[t.questionId] = t.english.trim();
        }
      }
    }
    const keyPoints: string[] = Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints
          .filter((k: unknown): k is string => typeof k === "string" && Boolean(k.trim()))
          .slice(0, 5)
      : [];

    const voiceSectionIndex = base.sections.findIndex(
      (s) => s.title === "Additional Patient Concerns (verbatim)",
    );

    const augmented: DoctorSummaryContent = {
      ...base,
      sections: base.sections.map((section, index) => {
        if (index !== voiceSectionIndex) return section;
        return {
          ...section,
          items: section.items.map((item) => {
            if (!item.qid || !translations[item.qid]) return item;
            return {
              ...item,
              // Verbatim transcript is preserved; the faithful English
              // rendering is added beneath it, never substituted.
              value: `${item.value}\nEnglish: ${translations[item.qid]}`,
            };
          }),
        };
      }),
      generatedBy: "ai" as const,
    };

    if (keyPoints.length > 0) {
      augmented.sections = [
        ...augmented.sections.filter((s) => s.title !== "Key Points"),
        { title: "Key Points", items: keyPoints.map((k) => ({ label: "Note", value: k })) },
      ];
    }
    augmented.text = buildDoctorSummaryText(augmented);
    return augmented;
  } catch {
    return base;
  }
}