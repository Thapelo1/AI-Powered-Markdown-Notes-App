import { createClient } from "@supabase/supabase-js";

// The browser uses only the public key; the database's RLS policies enforce per-user access.
export const NOTE_LIMIT = 20000;
export const LEGACY_NOTE_KEY = "margin-note";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function logUserEvent(eventType, details = {}) {
  if (!supabase) return;

  try {
    const { error } = await supabase.from("activity_events").insert({
      event_type: eventType,
      details,
    });
    if (error) throw error;
  } catch (error) {
    console.error(`Could not record user event "${eventType}":`, error);
  }
}

export function getAuthErrorMessage(error, fallback) {
  if (
    error?.name === "AuthRetryableFetchError"
    || error?.message === "Failed to fetch"
  ) {
    return "Could not reach the sign-in service. Check your connection and try again.";
  }
  return error?.message || fallback;
}
