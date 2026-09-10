import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
// The backend is the ONLY place that may hold the privileged key.
// Row Level Security blocks the publishable (anon) key from writing to
// patients, interview_sessions, interview_responses, consents,
// consultations and clinical_summaries, so all server-side persistence
// must go through the service-role client below.
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the React/Vite frontend.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

// Real service-role keys are either legacy JWTs or new sb_secret_ keys.
// Anything else (placeholders, a publishable key pasted into the wrong
// variable, fabricated values) must NEVER shadow the working publishable
// key — it would break even the endpoints that work today.
const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const SECRET_PATTERN = /^sb_secret_[A-Za-z0-9_-]+$/;

function looksLikeServiceKey(key: string | undefined): key is string {
  if (!key) return false;
  const trimmed = key.trim();
  return JWT_PATTERN.test(trimmed) || SECRET_PATTERN.test(trimmed);
}

let supabaseKey: string | undefined;
let persistenceMode: string;

if (looksLikeServiceKey(serviceRoleKey)) {
  supabaseKey = serviceRoleKey.trim();
  persistenceMode = "service-role (full persistence)";
} else {
  const rawServiceKey = (serviceRoleKey || "").trim();
  if (rawServiceKey) {
    console.warn(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY does not look like a valid " +
        "service-role key (expected a JWT or sb_secret_ value) — ignoring it. " +
        "Paste the real key from Supabase Dashboard → Project Settings → API."
    );
  }
  supabaseKey = publishableKey?.trim();
  persistenceMode = "publishable (medical writes will be rejected by RLS)";
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are missing");
}

console.log(`[supabase] persistence mode: ${persistenceMode}`);

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

/**
 * Maps a Supabase write failure to an actionable API error.
 * RLS rejections (42501) mean the backend is running without the
 * service-role key — surfaced explicitly so Render logs diagnose it.
 */
export function writeErrorMessage(error: { code?: string; message: string }, action: string): string {
  if (error.code === "42501") {
    return (
      `${action} was rejected by database policy (RLS). ` +
      "The backend is not using a valid SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return error.message;
}