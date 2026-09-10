/**
 * Canonical kiosk question bank, mirrored from
 * frontend/src/lib/kiosk-data.ts (ids, order, English prompts).
 *
 * interview_responses has a composite FK
 *   (session_id, question_key) → interview_questions(session_id, question_key)
 * so every session must have its question rows seeded BEFORE answers are
 * saved, and every answered key must exist for that session. Seeding uses
 * the frontend question ids verbatim — they are the traceable keys.
 */

export interface BankQuestion {
  key: string;
  text: string;
  order: number;
}

function bank(
  entries: Array<[string, string]>,
): BankQuestion[] {
  return entries.map(([key, text], index) => ({ key, text, order: index }));
}

const COMMON: Array<[string, string]> = [
  ["chief_complaint", "What is troubling you the most today?"],
  ["onset", "Since when do you have this problem?"],
  ["severity", "How bad is it right now?"],
  ["chest_alarm", "Along with the chest problem, do you have any of these right now?"],
  ["general_alarm", "Do you have any of these serious signs today?"],
];

const ALLOPATHY_EXTRA: Array<[string, string]> = [
  ["past_history", "Has a doctor told you that you have any of these?"],
  ["drug_history", "Are you taking any medicines daily?"],
  ["allergy", "Has any medicine ever caused rash, swelling or breathlessness?"],
  ["family_history", "In your family, does anyone have these illnesses?"],
  ["personal_history", "Do you take tobacco, beedi, cigarette or alcohol?"],
  ["ros", "In the last one month, did you notice any of these?"],
  ["prior_investigations", "Have you done any blood test or scan recently?"],
];

const AYUSH_EXTRA: Array<[string, string]> = [
  ["prakriti", "Since childhood, how is your body mostly?"],
  ["vikriti", "What has changed in your body these days?"],
  ["sara", "How is your skin, hair and muscle strength?"],
  ["samhanana", "How is your body build?"],
  ["pramana", "Has your body weight changed recently?"],
  ["satmya", "Which food suits you the most?"],
  ["sattva", "How do you handle worry and pain?"],
  ["ahara_shakti", "How is your hunger and digestion?"],
  ["vyayama_shakti", "How much can you walk without getting tired?"],
  ["vaya", "Which stage of life are you in?"],
  ["nidana", "What do you think started this problem?"],
  ["samprapti", "How did the problem grow with time?"],
];

export function questionsForMode(mode: "allopathy" | "ayush"): BankQuestion[] {
  return bank(mode === "ayush" ? [...COMMON, ...AYUSH_EXTRA] : [...COMMON, ...ALLOPATHY_EXTRA]);
}

export function findBankQuestion(
  mode: "allopathy" | "ayush",
  key: string,
): BankQuestion | null {
  return questionsForMode(mode).find((q) => q.key === key) || null;
}
