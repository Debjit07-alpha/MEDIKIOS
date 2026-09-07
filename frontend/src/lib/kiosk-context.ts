import { createContext } from "react";
import type { KioskContextValue } from "./kiosk-store";

export const KioskContext = createContext<KioskContextValue | null>(null);
