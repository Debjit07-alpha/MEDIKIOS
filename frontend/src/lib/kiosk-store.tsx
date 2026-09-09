import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DOC_LIBRARY,
  type CareMode,
  type DocKind,
  type ExtractedDoc,
  type LanguageCode,
  getLanguage,
  isLanguageCode,
} from "./kiosk-data";
import { setSpeechLocale } from "./speech";
import { KioskContext } from "./kiosk-context";

export type Patient = {
  name: string;
  age: number;
  sex: string;
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
  patient: Patient | null;
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
  patient: null,
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
  setPatient: (patient: Patient) => void;
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
    setSpeechLocale(getLanguage(state.language).speech);
    document.documentElement.lang = getLanguage(state.language).speech;
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
      setPatient: (patient) => patch({ patient }),
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
