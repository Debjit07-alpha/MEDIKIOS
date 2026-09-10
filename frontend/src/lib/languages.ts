/**
 * Single source of truth for every language MediKiosk can operate in.
 *
 * Every subsystem (language selector, i18n, browser speech, backend TTS/STT,
 * interview) must derive its language data from this module — never hardcode
 * a separate list elsewhere.
 *
 * The 23 languages are the Constitutionally scheduled languages of India
 * (Eighth Schedule) plus English. Order here is the official alphabetical
 * order and is stable: the UI renders sections from this same order so cards
 * never reshuffle between renders.
 *
 * Capability flags are for internal wiring and provider honesty only. They are
 * intentionally NOT surfaced to patients: a language is always selectable, and
 * a missing capability only means the app degrades gracefully (English UI text,
 * no narration) without ever resetting the patient's choice.
 */

export type LanguageCode =
  | "as"
  | "bn"
  | "brx"
  | "doi"
  | "gu"
  | "hi"
  | "kn"
  | "ks"
  | "kok"
  | "mai"
  | "ml"
  | "mni"
  | "mr"
  | "ne"
  | "or"
  | "pa"
  | "sa"
  | "sat"
  | "sd"
  | "ta"
  | "te"
  | "ur"
  | "en";

export type SpeechLocale = `${LanguageCode}-IN`;

export type LanguageConfig = {
  /** Stable app identifier. This is what kiosk state stores (never a display name). */
  code: LanguageCode;
  /** Speech/recognition locale used by browser TTS, STT and the backend. */
  locale: SpeechLocale;
  /** English name, shown under the native name on the card. */
  name: string;
  /** Name in the language's own script, shown prominently on the card. */
  nativeName: string;
  /** Writing system, kept for future rendering/accessibility needs. */
  script: string;
  enabled: boolean;
  /** Shown in the "Popular languages" section. Kept in the original UI order. */
  popular?: boolean;
  /** Full app UI translations exist (8 languages ship all screen strings). */
  uiAvailable?: boolean;
  /** Backend can attempt TTS for this locale (Google Cloud voice or fallback). */
  ttsSupported?: boolean;
  /** Backend Google Cloud STT accepts this locale. */
  sttSupported?: boolean;
};

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: "as",
    locale: "as-IN",
    name: "Assamese",
    nativeName: "অসমীয়া",
    script: "Assamese",
    enabled: true,
    sttSupported: true,
    ttsSupported: false,
  },
  {
    code: "bn",
    locale: "bn-IN",
    name: "Bengali",
    nativeName: "বাংলা",
    script: "Bengali",
    enabled: true,
    popular: true,
    uiAvailable: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "brx",
    locale: "brx-IN",
    name: "Bodo",
    nativeName: "बर'",
    script: "Devanagari",
    enabled: true,
    ttsSupported: false,
    sttSupported: false,
  },
  {
    code: "doi",
    locale: "doi-IN",
    name: "Dogri",
    nativeName: "डोगरी",
    script: "Devanagari",
    enabled: true,
    ttsSupported: false,
    sttSupported: false,
  },
  {
    code: "gu",
    locale: "gu-IN",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    script: "Gujarati",
    enabled: true,
    popular: true,
    uiAvailable: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "hi",
    locale: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    script: "Devanagari",
    enabled: true,
    popular: true,
    uiAvailable: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "kn",
    locale: "kn-IN",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    script: "Kannada",
    enabled: true,
    popular: true,
    uiAvailable: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "ks",
    locale: "ks-IN",
    name: "Kashmiri",
    nativeName: "कॉशुर",
    script: "Perso-Arabic",
    enabled: true,
    ttsSupported: false,
    sttSupported: false,
  },
  {
    code: "kok",
    locale: "kok-IN",
    name: "Konkani",
    nativeName: "कोंकणी",
    script: "Devanagari",
    enabled: true,
    ttsSupported: false,
    sttSupported: false,
  },
  {
    code: "mai",
    locale: "mai-IN",
    name: "Maithili",
    nativeName: "मैथिली",
    script: "Devanagari",
    enabled: true,
    ttsSupported: false,
    sttSupported: false,
  },
  {
    code: "ml",
    locale: "ml-IN",
    name: "Malayalam",
    nativeName: "മലയാളം",
    script: "Malayalam",
    enabled: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "mni",
    locale: "mni-IN",
    name: "Manipuri",
    nativeName: "ꯃꯤꯇꯩꯂꯣꯟ",
    script: "Meitei",
    enabled: true,
    ttsSupported: false,
    sttSupported: false,
  },
  {
    code: "mr",
    locale: "mr-IN",
    name: "Marathi",
    nativeName: "मराठी",
    script: "Devanagari",
    enabled: true,
    popular: true,
    uiAvailable: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "ne",
    locale: "ne-IN",
    name: "Nepali",
    nativeName: "नेपाली",
    script: "Devanagari",
    enabled: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "or",
    locale: "or-IN",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    script: "Odia",
    enabled: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "pa",
    locale: "pa-IN",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    script: "Gurmukhi",
    enabled: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "sa",
    locale: "sa-IN",
    name: "Sanskrit",
    nativeName: "संस्कृतम्",
    script: "Devanagari",
    enabled: true,
    ttsSupported: false,
    sttSupported: false,
  },
  {
    code: "sat",
    locale: "sat-IN",
    name: "Santali",
    nativeName: "ᱥᱟᱱᱛᱟᱲᱤ",
    script: "Ol Chiki",
    enabled: true,
    ttsSupported: false,
    sttSupported: false,
  },
  {
    code: "sd",
    locale: "sd-IN",
    name: "Sindhi",
    nativeName: "سنڌي",
    script: "Perso-Arabic",
    enabled: true,
    ttsSupported: false,
    sttSupported: false,
  },
  {
    code: "ta",
    locale: "ta-IN",
    name: "Tamil",
    nativeName: "தமிழ்",
    script: "Tamil",
    enabled: true,
    popular: true,
    uiAvailable: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "te",
    locale: "te-IN",
    name: "Telugu",
    nativeName: "తెలుగు",
    script: "Telugu",
    enabled: true,
    popular: true,
    uiAvailable: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "ur",
    locale: "ur-IN",
    name: "Urdu",
    nativeName: "اردو",
    script: "Perso-Arabic",
    enabled: true,
    ttsSupported: true,
    sttSupported: true,
  },
  {
    code: "en",
    locale: "en-IN",
    name: "English",
    nativeName: "English",
    script: "Latin",
    enabled: true,
    popular: true,
    uiAvailable: true,
    ttsSupported: true,
    sttSupported: true,
  },
];

export const DEFAULT_LANGUAGE_CODE: LanguageCode = "en";

/**
 * Original Popular section order, kept stable so returning users see the same
 * arrangement they are used to. Filtered view of the same central config.
 */
export const POPULAR_LANGUAGE_CODES: LanguageCode[] = [
  "hi",
  "en",
  "mr",
  "bn",
  "ta",
  "te",
  "kn",
  "gu",
];

export function getLanguageConfig(code: string): LanguageConfig {
  return (
    SUPPORTED_LANGUAGES.find((language) => language.code === code) ??
    getLanguageConfig(DEFAULT_LANGUAGE_CODE)
  );
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return (
    typeof value === "string" && SUPPORTED_LANGUAGES.some((language) => language.code === value)
  );
}

export function getSpeechLocale(code: LanguageCode): SpeechLocale {
  return getLanguageConfig(code).locale;
}

export function getAllLanguages(): LanguageConfig[] {
  return SUPPORTED_LANGUAGES.filter((language) => language.enabled);
}

export function getPopularLanguages(): LanguageConfig[] {
  return POPULAR_LANGUAGE_CODES.map((code) => getLanguageConfig(code));
}

/**
 * The 8 fully integrated kiosk languages, in the original Popular order.
 * These render as the main cards. Same objects as SUPPORTED_LANGUAGES —
 * never duplicated.
 */
export const MAIN_SUPPORTED_LANGUAGE_CODES: LanguageCode[] = [...POPULAR_LANGUAGE_CODES];

export function getMainSupportedLanguages(): LanguageConfig[] {
  return MAIN_SUPPORTED_LANGUAGE_CODES.map((code) => getLanguageConfig(code));
}

/**
 * The remaining enabled languages (no full UI translations yet).
 * Rendered inside the collapsed "More Indian Languages" accordion, in
 * official SUPPORTED_LANGUAGES order. Behavior on select is unchanged.
 */
export function getAdditionalLanguages(): LanguageConfig[] {
  const main = new Set<LanguageCode>(MAIN_SUPPORTED_LANGUAGE_CODES);
  return SUPPORTED_LANGUAGES.filter((language) => language.enabled && !main.has(language.code));
}

export const DEFAULT_LANGUAGE: LanguageConfig = getLanguageConfig(DEFAULT_LANGUAGE_CODE);

/**
 * Structural sanity check, exported so tests/tooling (and dev consoles) can
 * catch mistakes in the config. Returns a list of problems; empty = healthy.
 */
export function validateLanguageConfig(): string[] {
  const problems: string[] = [];
  const seen = new Set<LanguageCode>();
  const locales = new Set<string>();
  for (const language of SUPPORTED_LANGUAGES) {
    if (seen.has(language.code)) problems.push(`Duplicate code ${language.code}`);
    seen.add(language.code);
    const expected: SpeechLocale = `${language.code}-IN`;
    if (language.locale !== expected) {
      problems.push(`${language.code}: locale ${language.locale} does not match ${expected}`);
    }
    if (locales.has(language.locale)) problems.push(`Duplicate locale ${language.locale}`);
    locales.add(language.locale);
    if (!language.name || !language.nativeName) {
      problems.push(`${language.code}: missing display name`);
    }
  }
  for (const code of POPULAR_LANGUAGE_CODES) {
    if (!seen.has(code)) problems.push(`Popular code ${code} is not in SUPPORTED_LANGUAGES`);
  }
  for (const code of MAIN_SUPPORTED_LANGUAGE_CODES) {
    if (!seen.has(code)) problems.push(`Main code ${code} is not in SUPPORTED_LANGUAGES`);
  }
  return problems;
}

if (typeof window !== "undefined" && import.meta.env?.DEV) {
  const problems = validateLanguageConfig();
  if (problems.length > 0) {
    console.warn("[LANGUAGES] config problems:", problems);
  }
}
