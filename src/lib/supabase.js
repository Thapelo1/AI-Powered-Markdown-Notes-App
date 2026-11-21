import { createClient } from "@supabase/supabase-js";

// The browser uses only the public key; the database's RLS policies enforce per-user access.
export const NOTE_LIMIT = 20000;
export const LEGACY_NOTE_KEY = "margin-note";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;
