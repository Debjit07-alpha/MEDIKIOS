import type { Patient } from "./kiosk-store";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * The ONE canonical identifier for the kiosk session: patients.id.
 * Returns null for legacy/offline records (missing or non-UUID id) so
 * callers can redirect to registration instead of writing orphan rows.
 */
export function canonicalPatientId(patient: Patient | null | undefined): string | null {
  if (!patient?.id || !isUuid(patient.id)) return null;
  return patient.id;
}
