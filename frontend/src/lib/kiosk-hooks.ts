import { useContext } from "react";
import { getLanguage } from "./kiosk-data";
import { translate, type TranslationKey } from "./i18n";
import { KioskContext } from "./kiosk-context";

export function useKiosk() {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error("useKiosk must be used inside KioskProvider");
  return ctx;
}

export function useLanguage() {
  const { language } = useKiosk();
  return {
    language,
    profile: getLanguage(language),
    t: (key: TranslationKey) => translate(language, key),
  };
}

export function useTranslation() {
  const { language } = useKiosk();
  return {
    language,
    t: (key: TranslationKey) => translate(language, key),
  };
}
