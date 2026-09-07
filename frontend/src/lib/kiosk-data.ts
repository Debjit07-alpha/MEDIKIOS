export type CareMode = "allopathy" | "ayush";

export type LanguageCode = "hi" | "en" | "mr" | "bn" | "ta" | "te" | "kn" | "gu";
export type SpeechLocale =
  "hi-IN" | "en-IN" | "mr-IN" | "bn-IN" | "ta-IN" | "te-IN" | "kn-IN" | "gu-IN";

export type Language = {
  code: LanguageCode;
  native: string;
  english: string;
  speech: SpeechLocale;
};

export const DEFAULT_LANGUAGE: Language = {
  code: "en",
  native: "English",
  english: "English",
  speech: "en-IN",
};

export const LANGUAGES: Language[] = [
  { code: "hi", native: "हिन्दी", english: "Hindi", speech: "hi-IN" },
  DEFAULT_LANGUAGE,
  { code: "mr", native: "मराठी", english: "Marathi", speech: "mr-IN" },
  { code: "bn", native: "বাংলা", english: "Bengali", speech: "bn-IN" },
  { code: "ta", native: "தமிழ்", english: "Tamil", speech: "ta-IN" },
  { code: "te", native: "తెలుగు", english: "Telugu", speech: "te-IN" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", speech: "kn-IN" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", speech: "gu-IN" },
];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && LANGUAGES.some((language) => language.code === value);
}

export function getLanguage(code: LanguageCode) {
  return LANGUAGES.find((language) => language.code === code) ?? DEFAULT_LANGUAGE;
}

export const STEPS = [
  { id: "language", label: "Language", to: "/language" },
  { id: "consent", label: "Consent", to: "/consent" },
  { id: "identity", label: "Identity", to: "/identity" },
  { id: "care", label: "Care", to: "/care" },
  { id: "start", label: "Start", to: "/dashboard" },
  { id: "questions", label: "Questions", to: "/interview" },
  { id: "papers", label: "Papers", to: "/papers" },
  { id: "timeline", label: "Timeline", to: "/timeline" },
  { id: "summary", label: "Summary", to: "/summary" },
  { id: "share", label: "Share", to: "/share" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export type AnswerOption = {
  id: string;
  label: string;
  sublabel?: string;
  emoji?: string;
  redFlag?: boolean;
};

export type Question = {
  id: string;
  mode: CareMode | "both";
  /** Structured clinical field the answer maps to. Never shown to the patient. */
  field: string;
  fieldLabel: string;
  section: string;
  prompt: string;
  hint?: string;
  multi?: boolean;
  options: AnswerOption[];
  /** Adaptive: only asked when this returns true. */
  showIf?: (answers: Record<string, string[]>) => boolean;
};

const has = (answers: Record<string, string[]>, id: string, value: string) =>
  (answers[id] ?? []).includes(value);

export const QUESTIONS: Question[] = [
  {
    id: "chief_complaint",
    mode: "both",
    field: "chiefComplaint",
    fieldLabel: "Chief complaint",
    section: "Chief Complaint",
    prompt: "What is troubling you the most today?",
    hint: "Say it in your own words, or touch a picture.",
    options: [
      { id: "chest", label: "Chest pain or heaviness", emoji: "💗" },
      { id: "breath", label: "Trouble breathing", emoji: "🫁" },
      { id: "fever", label: "Fever", emoji: "🌡️" },
      { id: "stomach", label: "Stomach pain", emoji: "🫄" },
      { id: "joints", label: "Joint or back pain", emoji: "🦵" },
      { id: "weak", label: "Weakness or dizziness", emoji: "😵" },
    ],
  },
  {
    id: "onset",
    mode: "both",
    field: "hpi.onset",
    fieldLabel: "Onset & duration",
    section: "History of Present Illness",
    prompt: "Since when do you have this problem?",
    options: [
      { id: "today", label: "Started today", emoji: "🌅" },
      { id: "week", label: "A few days", emoji: "📅" },
      { id: "month", label: "About a month", emoji: "🗓️" },
      { id: "long", label: "Many months or years", emoji: "⏳" },
    ],
  },
  {
    id: "severity",
    mode: "both",
    field: "hpi.severity",
    fieldLabel: "Severity",
    section: "History of Present Illness",
    prompt: "How bad is it right now?",
    hint: "Touch the face that matches your feeling.",
    options: [
      { id: "mild", label: "Mild", sublabel: "I can do my work", emoji: "🙂" },
      { id: "moderate", label: "Moderate", sublabel: "It disturbs me", emoji: "😕" },
      { id: "severe", label: "Severe", sublabel: "I cannot bear it", emoji: "😣" },
    ],
  },
  {
    id: "chest_alarm",
    mode: "both",
    field: "hpi.alarmFeatures",
    fieldLabel: "Alarm features",
    section: "History of Present Illness",
    prompt: "Along with the chest problem, do you have any of these right now?",
    hint: "This helps us call the doctor faster if needed.",
    multi: true,
    showIf: (a) => has(a, "chief_complaint", "chest") || has(a, "chief_complaint", "breath"),
    options: [
      { id: "arm", label: "Pain going to the left arm or jaw", emoji: "💪", redFlag: true },
      { id: "sweat", label: "Cold sweating", emoji: "💧", redFlag: true },
      { id: "faint", label: "Feeling of fainting", emoji: "🌀", redFlag: true },
      { id: "none", label: "None of these", emoji: "✅" },
    ],
  },
  {
    id: "general_alarm",
    mode: "both",
    field: "hpi.alarmFeatures",
    fieldLabel: "Alarm features",
    section: "History of Present Illness",
    prompt: "Do you have any of these serious signs today?",
    multi: true,
    showIf: (a) => !has(a, "chief_complaint", "chest") && !has(a, "chief_complaint", "breath"),
    options: [
      { id: "bleeding", label: "Bleeding that will not stop", emoji: "🩸", redFlag: true },
      { id: "unconscious", label: "Became unconscious", emoji: "😵‍💫", redFlag: true },
      { id: "speech", label: "Sudden weakness on one side", emoji: "🚶", redFlag: true },
      { id: "none", label: "None of these", emoji: "✅" },
    ],
  },
  {
    id: "past_history",
    mode: "allopathy",
    field: "pastHistory",
    fieldLabel: "Past medical & surgical history",
    section: "Past History",
    prompt: "Has a doctor told you that you have any of these?",
    multi: true,
    options: [
      { id: "dm", label: "Sugar (Diabetes)", emoji: "🍬" },
      { id: "htn", label: "Blood pressure", emoji: "🩺" },
      { id: "asthma", label: "Asthma", emoji: "🌬️" },
      { id: "tb", label: "TB in the past", emoji: "🫁" },
      { id: "surgery", label: "Any operation before", emoji: "🏥" },
      { id: "none", label: "None of these", emoji: "✅" },
    ],
  },
  {
    id: "drug_history",
    mode: "allopathy",
    field: "drugHistory",
    fieldLabel: "Drug history",
    section: "Medication & Allergy",
    prompt: "Are you taking any medicines daily?",
    options: [
      { id: "yes_regular", label: "Yes, every day", emoji: "💊" },
      { id: "sometimes", label: "Only sometimes", emoji: "🕒" },
      { id: "no", label: "No medicines", emoji: "🚫" },
    ],
  },
  {
    id: "allergy",
    mode: "allopathy",
    field: "allergyHistory",
    fieldLabel: "Allergy history",
    section: "Medication & Allergy",
    prompt: "Has any medicine ever caused rash, swelling or breathlessness?",
    options: [
      { id: "penicillin", label: "Yes, a pain or fever medicine", emoji: "⚠️" },
      { id: "other", label: "Yes, but I do not know the name", emoji: "❓" },
      { id: "no", label: "No, never", emoji: "✅" },
    ],
  },
  {
    id: "family_history",
    mode: "allopathy",
    field: "familyHistory",
    fieldLabel: "Family history",
    section: "Family History",
    prompt: "In your family, does anyone have these illnesses?",
    multi: true,
    options: [
      { id: "dm", label: "Sugar", emoji: "🍬" },
      { id: "htn", label: "Blood pressure", emoji: "🩺" },
      { id: "heart", label: "Heart problem", emoji: "💗" },
      { id: "cancer", label: "Cancer", emoji: "🎗️" },
      { id: "none", label: "Nobody", emoji: "✅" },
    ],
  },
  {
    id: "personal_history",
    mode: "allopathy",
    field: "personalHistory",
    fieldLabel: "Personal history",
    section: "Personal History",
    prompt: "Do you take tobacco, beedi, cigarette or alcohol?",
    multi: true,
    options: [
      { id: "tobacco", label: "Chewing tobacco", emoji: "🌿" },
      { id: "smoke", label: "Beedi or cigarette", emoji: "🚬" },
      { id: "alcohol", label: "Alcohol", emoji: "🍶" },
      { id: "none", label: "None", emoji: "✅" },
    ],
  },
  {
    id: "ros",
    mode: "allopathy",
    field: "reviewOfSystems",
    fieldLabel: "Review of systems",
    section: "Review of Systems",
    prompt: "In the last one month, did you notice any of these?",
    multi: true,
    options: [
      { id: "weight", label: "Weight loss", emoji: "⚖️" },
      { id: "appetite", label: "Less hunger", emoji: "🍚" },
      { id: "urine", label: "Passing urine often", emoji: "🚻" },
      { id: "sleep", label: "Poor sleep", emoji: "🌙" },
      { id: "swelling", label: "Swelling in legs", emoji: "🦶" },
      { id: "none", label: "Nothing like this", emoji: "✅" },
    ],
  },
  {
    id: "prior_investigations",
    mode: "allopathy",
    field: "priorInvestigations",
    fieldLabel: "Prior investigations",
    section: "Prior Investigations",
    prompt: "Have you done any blood test or scan recently?",
    options: [
      { id: "blood", label: "Yes, blood test", emoji: "🧪" },
      { id: "scan", label: "Yes, X-ray or scan", emoji: "🩻" },
      { id: "no", label: "No test done", emoji: "🚫" },
    ],
  },

  /* ---------------- AYUSH extended history ---------------- */
  {
    id: "prakriti",
    mode: "ayush",
    field: "prakriti",
    fieldLabel: "Prakriti (body constitution)",
    section: "Prakriti",
    prompt: "Since childhood, how is your body mostly?",
    options: [
      { id: "vata", label: "Thin, dry skin, feels cold", emoji: "🍃" },
      { id: "pitta", label: "Warm body, sweats, quick anger", emoji: "🔥" },
      { id: "kapha", label: "Heavy build, calm, slow", emoji: "💧" },
    ],
  },
  {
    id: "vikriti",
    mode: "ayush",
    field: "vikriti",
    fieldLabel: "Vikriti (present imbalance)",
    section: "Vikriti",
    prompt: "What has changed in your body these days?",
    multi: true,
    options: [
      { id: "gas", label: "Gas and bloating", emoji: "🫧" },
      { id: "burning", label: "Burning or acidity", emoji: "🔥" },
      { id: "heavy", label: "Heaviness and cough", emoji: "🌫️" },
      { id: "pain", label: "Body pain and stiffness", emoji: "🦴" },
    ],
  },
  {
    id: "sara",
    mode: "ayush",
    field: "sara",
    fieldLabel: "Sara (tissue quality)",
    section: "Dashavidha Pariksha",
    prompt: "How is your skin, hair and muscle strength?",
    options: [
      { id: "uttama", label: "Very good, shining", emoji: "✨" },
      { id: "madhyama", label: "Average", emoji: "🙂" },
      { id: "avara", label: "Dull and weak", emoji: "🥀" },
    ],
  },
  {
    id: "samhanana",
    mode: "ayush",
    field: "samhanana",
    fieldLabel: "Samhanana (body compactness)",
    section: "Dashavidha Pariksha",
    prompt: "How is your body build?",
    options: [
      { id: "firm", label: "Firm and strong", emoji: "💪" },
      { id: "medium", label: "Medium", emoji: "🧍" },
      { id: "loose", label: "Loose and weak", emoji: "🪶" },
    ],
  },
  {
    id: "pramana",
    mode: "ayush",
    field: "pramana",
    fieldLabel: "Pramana (body proportion)",
    section: "Dashavidha Pariksha",
    prompt: "Has your body weight changed recently?",
    options: [
      { id: "gain", label: "I have gained weight", emoji: "⬆️" },
      { id: "same", label: "Same as before", emoji: "➡️" },
      { id: "loss", label: "I have lost weight", emoji: "⬇️" },
    ],
  },
  {
    id: "satmya",
    mode: "ayush",
    field: "satmya",
    fieldLabel: "Satmya (habituation)",
    section: "Dashavidha Pariksha",
    prompt: "Which food suits you the most?",
    options: [
      { id: "all", label: "All types of food suit me", emoji: "🍲" },
      { id: "light", label: "Only light, simple food", emoji: "🥣" },
      { id: "spicy", label: "I am used to spicy food", emoji: "🌶️" },
    ],
  },
  {
    id: "sattva",
    mode: "ayush",
    field: "sattva",
    fieldLabel: "Sattva (mental strength)",
    section: "Dashavidha Pariksha",
    prompt: "How do you handle worry and pain?",
    options: [
      { id: "strong", label: "I stay calm", emoji: "🧘" },
      { id: "medium", label: "Sometimes I get disturbed", emoji: "😐" },
      { id: "weak", label: "I get frightened easily", emoji: "😟" },
    ],
  },
  {
    id: "ahara_shakti",
    mode: "ayush",
    field: "aharaShakti",
    fieldLabel: "Ahara Shakti (digestive capacity)",
    section: "Dashavidha Pariksha",
    prompt: "How is your hunger and digestion?",
    options: [
      { id: "good", label: "Good hunger, food digests well", emoji: "🍛" },
      { id: "irregular", label: "Hunger comes and goes", emoji: "🔄" },
      { id: "poor", label: "Very little hunger", emoji: "🚫" },
    ],
  },
  {
    id: "vyayama_shakti",
    mode: "ayush",
    field: "vyayamaShakti",
    fieldLabel: "Vyayama Shakti (physical capacity)",
    section: "Dashavidha Pariksha",
    prompt: "How much can you walk without getting tired?",
    options: [
      { id: "high", label: "More than one kilometre", emoji: "🚶" },
      { id: "medium", label: "A little distance only", emoji: "🐢" },
      { id: "low", label: "I get tired inside the house", emoji: "🛏️" },
    ],
  },
  {
    id: "vaya",
    mode: "ayush",
    field: "vaya",
    fieldLabel: "Vaya (age stage)",
    section: "Dashavidha Pariksha",
    prompt: "Which stage of life are you in?",
    options: [
      { id: "bala", label: "Young", emoji: "🧒" },
      { id: "madhyama", label: "Middle age", emoji: "🧑" },
      { id: "vriddha", label: "Elder", emoji: "🧓" },
    ],
  },
  {
    id: "nidana",
    mode: "ayush",
    field: "nidana",
    fieldLabel: "Nidana (causative factors)",
    section: "Nidana & Samprapti",
    prompt: "What do you think started this problem?",
    multi: true,
    options: [
      { id: "food", label: "Wrong or heavy food", emoji: "🍟" },
      { id: "cold", label: "Cold or season change", emoji: "❄️" },
      { id: "stress", label: "Worry or stress", emoji: "😔" },
      { id: "work", label: "Heavy physical work", emoji: "🧱" },
      { id: "sleep", label: "Late nights", emoji: "🌙" },
    ],
  },
  {
    id: "samprapti",
    mode: "ayush",
    field: "samprapti",
    fieldLabel: "Samprapti (progression)",
    section: "Nidana & Samprapti",
    prompt: "How did the problem grow with time?",
    options: [
      { id: "slow", label: "Slowly, little by little", emoji: "🐌" },
      { id: "fast", label: "Very fast", emoji: "⚡" },
      { id: "wave", label: "Comes and goes", emoji: "🌊" },
    ],
  },
];

export const questionsForMode = (mode: CareMode) =>
  QUESTIONS.filter((q) => q.mode === "both" || q.mode === mode);

/* ---------------- Documents ---------------- */

export type DocKind = "prescription" | "lab" | "discharge";

export type ExtractedDoc = {
  id: string;
  kind: DocKind;
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

export const DOC_LIBRARY: Record<DocKind, ExtractedDoc> = {
  prescription: {
    id: "doc-rx",
    kind: "prescription",
    kindLabel: "Prescription",
    title: "Out-patient Prescription",
    facility: "District General Hospital, Cardiology OPD",
    date: "2026-06-18",
    diagnoses: ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
    medications: [
      { name: "Metformin", dose: "500 mg", schedule: "Twice daily", duration: "3 months" },
      {
        name: "Telmisartan",
        dose: "40 mg",
        schedule: "Once daily (morning)",
        duration: "3 months",
      },
      { name: "Atorvastatin", dose: "10 mg", schedule: "Once at night", duration: "3 months" },
    ],
    note: "Advised salt restriction and daily 30 minute walk.",
  },
  lab: {
    id: "doc-lab",
    kind: "lab",
    kindLabel: "Laboratory report",
    title: "Laboratory Report — Biochemistry",
    facility: "Civil Hospital Central Lab",
    date: "2026-08-02",
    diagnoses: ["Poor glycaemic control"],
    values: [
      {
        name: "Fasting Blood Sugar",
        value: "186",
        unit: "mg/dL",
        normal: "70–110",
        abnormal: true,
      },
      { name: "HbA1c", value: "8.9", unit: "%", normal: "< 5.7", abnormal: true },
      { name: "Serum Creatinine", value: "1.4", unit: "mg/dL", normal: "0.6–1.2", abnormal: true },
      { name: "Haemoglobin", value: "12.8", unit: "g/dL", normal: "12–16", abnormal: false },
      { name: "Total Cholesterol", value: "196", unit: "mg/dL", normal: "< 200", abnormal: false },
    ],
  },
  discharge: {
    id: "doc-dis",
    kind: "discharge",
    kindLabel: "Discharge paper",
    title: "Discharge Summary — Medicine Ward",
    facility: "District General Hospital, Ward 4",
    date: "2025-11-27",
    diagnoses: ["Community acquired pneumonia", "Type 2 Diabetes Mellitus"],
    medications: [
      {
        name: "Amoxicillin-Clavulanate",
        dose: "625 mg",
        schedule: "Thrice daily",
        duration: "7 days",
      },
      {
        name: "Insulin (Human Mixtard)",
        dose: "12 U",
        schedule: "Before breakfast",
        duration: "On discharge",
      },
    ],
    note: "Admitted for 5 days with fever and cough. Improved on antibiotics. Review after 1 week.",
  },
};

/* ---------------- Physician queue ---------------- */

export type QueuePatient = {
  id: string;
  name: string;
  age: number;
  sex: string;
  uhid: string;
  mode: CareMode;
  status: "waiting" | "in-progress" | "completed";
  redFlag?: string;
  complaint: string;
  waitedMinutes: number;
  docs: number;
};

export const QUEUE: QueuePatient[] = [
  {
    id: "p-101",
    name: "Sunita Devi",
    age: 71,
    sex: "Female",
    uhid: "DGH/2026/10388",
    mode: "allopathy",
    status: "completed",
    redFlag: "Chest pain radiating to left arm with cold sweating",
    complaint: "Chest pain since morning",
    waitedMinutes: 4,
    docs: 2,
  },
  {
    id: "p-102",
    name: "Ramesh Prasad Yadav",
    age: 68,
    sex: "Male",
    uhid: "DGH/2026/10412",
    mode: "allopathy",
    status: "completed",
    complaint: "Weakness, high sugar readings",
    waitedMinutes: 11,
    docs: 3,
  },
  {
    id: "p-103",
    name: "Abdul Rahman",
    age: 64,
    sex: "Male",
    uhid: "DGH/2026/10415",
    mode: "ayush",
    status: "completed",
    complaint: "Joint pain and stiffness",
    waitedMinutes: 18,
    docs: 1,
  },
  {
    id: "p-104",
    name: "Lakshmi Narayanan",
    age: 59,
    sex: "Female",
    uhid: "DGH/2026/10419",
    mode: "ayush",
    status: "in-progress",
    complaint: "Acidity and poor sleep",
    waitedMinutes: 6,
    docs: 0,
  },
  {
    id: "p-105",
    name: "Mohan Singh",
    age: 77,
    sex: "Male",
    uhid: "DGH/2026/10421",
    mode: "allopathy",
    status: "waiting",
    complaint: "Breathlessness on walking",
    waitedMinutes: 2,
    docs: 0,
  },
  {
    id: "p-106",
    name: "Parvati Bai",
    age: 66,
    sex: "Female",
    uhid: "DGH/2026/10424",
    mode: "allopathy",
    status: "waiting",
    complaint: "Fever for four days",
    waitedMinutes: 9,
    docs: 1,
  },
];
