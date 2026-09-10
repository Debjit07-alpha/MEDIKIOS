import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DOC_LIBRARY,
  type CareMode,
  type DocKind,
  type ExtractedDoc,
  type LanguageCode,
  getSpeechLocaleFromLanguage,
  isLanguageCode,
} from "./kiosk-data";
import { setSpeechLocale } from "./speech";
import { KioskContext } from "./kiosk-context";

export type Patient = {
  /** Canonical identifier: the patients.id UUID created at registration.
   *  EVERY patient-specific backend call must use this value.
   *  Empty string until the backend confirms creation. */
  id: string;
  name: string;
  age: number;
  sex: string;
  /** Display label (hospital UHID / patient code). Never used as a key. */
  uhid: string;
  route: "abha" | "aadhaar" | "new";
};

export type RedFlag = {
  label: string;
  detail: string;
  at: string;
} | null;

type KioskState = {
  language: LanguageCode;
  identityMethod: "abha" | "aadhaar" | "new" | null;
  abhaNumber: string;
  consent: boolean;
  consentSynced: boolean;
  patient: Patient | null;
  /** Canonical interview_sessions.id for the active visit. Created once
   *  when Questions starts, reused for every answer + document. */
  sessionId: string | null;
  careMode: CareMode | null;
  answers: Record<string, string[]>;
  voiceAnswers: Record<string, string>;
  documents: ExtractedDoc[];
  redFlag: RedFlag;
  shared: boolean;
  summaryConfirmed: boolean;
};

const initialState: KioskState = {
  language: "en",
  identityMethod: null,
  abhaNumber: "",
  consent: false,
  consentSynced: false,
  patient: null,
  sessionId: null,
  careMode: null,
  answers: {},
  voiceAnswers: {},
  documents: [],
  redFlag: null,
  shared: false,
  summaryConfirmed: false,
};

export type KioskContextValue = KioskState & {
  setLanguage: (code: LanguageCode) => void;
  setIdentityMethod: (method: "abha" | "aadhaar" | "new") => void;
  clearIdentityMethod: () => void;
  setAbhaNumber: (number: string) => void;
  giveConsent: () => void;
  markConsentSynced: () => void;
  setPatient: (patient: Patient) => void;
  setSessionId: (sessionId: string | null) => void;
  setCareMode: (mode: CareMode) => void;
  answer: (questionId: string, values: string[]) => void;
  voiceAnswer: (questionId: string, transcript: string) => void;
  addDocument: (kind: DocKind) => ExtractedDoc;
  raiseRedFlag: (flag: NonNullable<RedFlag>) => void;
  clearRedFlag: () => void;
  markShared: () => void;
  confirmSummary: () => void;
  reset: () => void;
};

const STORAGE_KEY = "medikiosk-session-v1";

export function KioskProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KioskState>(initialState);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<KioskState>;
        setState({
          ...initialState,
          ...saved,
          language: isLanguageCode(saved.language) ? saved.language : initialState.language,
        });
      }
    } catch {
      /* ignore corrupted session */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state]);

  useEffect(() => {
    const speechLocale = getSpeechLocaleFromLanguage(state.language);
    setSpeechLocale(speechLocale);
    document.documentElement.lang = speechLocale;
    console.info("[VOICE DEBUG] Language changed after navigation", {
      selectedLanguage: state.language,
      speechLocale,
    });
  }, [state.language]);

  const patch = useCallback(
    (next: Partial<KioskState>) => setState((prev) => ({ ...prev, ...next })),
    [],
  );

  const value = useMemo<KioskContextValue>(
    () => ({
      ...state,
      setLanguage: (language) => patch({ language }),
      setIdentityMethod: (identityMethod) => patch({ identityMethod }),
      clearIdentityMethod: () => patch({ identityMethod: null }),
      setAbhaNumber: (abhaNumber) => patch({ abhaNumber }),
      giveConsent: () => patch({ consent: true }),
      markConsentSynced: () => patch({ consentSynced: true }),
      setPatient: (patient) => patch({ patient, sessionId: null, consentSynced: false }),
      setSessionId: (sessionId) => patch({ sessionId }),
      setCareMode: (careMode) => patch({ careMode }),
      answer: (questionId, values) =>
        setState((prev) => ({ ...prev, answers: { ...prev.answers, [questionId]: values } })),
      voiceAnswer: (questionId, transcript) =>
        setState((prev) => ({
          ...prev,
          voiceAnswers: { ...prev.voiceAnswers, [questionId]: transcript },
        })),
      addDocument: (kind) => {
        const doc = { ...DOC_LIBRARY[kind], id: `${DOC_LIBRARY[kind].id}-${Date.now()}` };
        setState((prev) => ({ ...prev, documents: [...prev.documents, doc] }));
        return doc;
      },
      raiseRedFlag: (flag) => patch({ redFlag: flag }),
      clearRedFlag: () => patch({ redFlag: null }),
      markShared: () => patch({ shared: true }),
      confirmSummary: () => patch({ summaryConfirmed: true }),
      reset: () => setState(initialState),
    }),
    [state, patch],
  );

  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}
