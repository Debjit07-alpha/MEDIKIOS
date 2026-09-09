import type { SupabaseClient } from "@supabase/supabase-js";

/** Matches a canonical lowercase UUID v1-v5. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",
};

export function extensionForMime(mime: string): string {
  return MIME_EXTENSION[mime] || ".jpg";
}

export function publicStorageUrl(path: string): string | null {
  return process.env.SUPABASE_URL
    ? `${process.env.SUPABASE_URL}/storage/v1/object/public/prescriptions/${path}`
    : null;
}

/**
 * medical_documents.document_type has a CHECK constraint allowing exactly
 * 'prescription' | 'lab_report' | 'other'. The richer 10-value classification
 * produced by Gemini is carried in the analysis payload, so we map it down
 * to one of the three categories the table will accept.
 */
export function dbDocumentType(documentType: string): string {
  switch (documentType) {
    case "prescription":
      return "prescription";
    case "blood_test_report":
    case "urine_test_report":
    case "glucose_or_sugar_report":
    case "lab_report":
      return "lab_report";
    default:
      return "other";
  }
}

/**
 * Resolve a real wall id (UUID) for the patient from whatever identifier was
 * sent. medical_documents.patient_id is a UUID NOT NULL with a foreign key into
 * patients(id), so a non-UUID identifier must be resolved server-side.
 * Throws when the identifier cannot be resolved to a UUID.
 */
export async function resolvePatientId(
  supabase: SupabaseClient,
  patientId: string,
): Promise<string> {
  if (isUuid(patientId)) return patientId;

  for (const column of ["abha_number", "aadhaar_id", "phone"]) {
    const { data } = await supabase
      .from("patients")
      .select("id")
      .eq(column, patientId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  throw new Error(
    `Could not resolve patient "${patientId}" to a patient id. ` +
      `medical_documents.patient_id requires a UUID that exists in patients(id).`,
  );
}