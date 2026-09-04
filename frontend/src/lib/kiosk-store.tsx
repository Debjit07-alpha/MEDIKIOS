import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DOC_LIBRARY,
  LANGUAGES,
  type CareMode,
  type DocKind,
  type ExtractedDoc,
  type LanguageCode,
} from "./kiosk-data";
import { setSpeechLocale } from "./speech";

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
  consent: boolean;
  patient: Patient | null;
  careMode: CareMode | null;
  answers: Record<string, string[]>;
  documents: ExtractedDoc[];
  redFlag: RedFlag;
  shared: boolean;
  summaryConfirmed: boolean;
};

const initialState: KioskState = {
  language: "en",
  consent: false,
  patient: null,
  careMode: null,
  answers: {},
  documents: [],
  redFlag: null,
  shared: false,
  summaryConfirmed: false,
};

type KioskContextValue = KioskState & {
  setLanguage: (code: LanguageCode) => void;
  giveConsent: () => void;
  setPatient: (patient: Patient) => void;
  setCareMode: (mode: CareMode) => void;
  answer: (questionId: string, values: string[]) => void;
  addDocument: (kind: DocKind) => ExtractedDoc;
  raiseRedFlag: (flag: NonNullable<RedFlag>) => void;
  clearRedFlag: () => void;
  markShared: () => void;
  confirmSummary: () => void;
  reset: () => void;
};

const KioskContext = createContext<KioskContextValue | null>(null);
const STORAGE_KEY = "medikiosk-session-v1";

export function KioskProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KioskState>(initialState);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as KioskState) });
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
    const lang = LANGUAGES.find((l) => l.code === state.language);
    setSpeechLocale(lang?.speech ?? "en-IN");
  }, [state]);

  const patch = useCallback(
    (next: Partial<KioskState>) => setState((prev) => ({ ...prev, ...next })),
    [],
  );

  const value = useMemo<KioskContextValue>(
    () => ({
      ...state,
      setLanguage: (language) => patch({ language }),
      giveConsent: () => patch({ consent: true }),
      setPatient: (patient) => patch({ patient }),
      setCareMode: (careMode) => patch({ careMode }),
      answer: (questionId, values) =>
        setState((prev) => ({ ...prev, answers: { ...prev.answers, [questionId]: values } })),
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

export function useKiosk() {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error("useKiosk must be used inside KioskProvider");
  return ctx;
}
