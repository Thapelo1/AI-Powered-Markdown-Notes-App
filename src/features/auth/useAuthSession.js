import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";

// Restore the persisted session once, then keep the UI synchronized with auth events.
export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return undefined;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      setAuthError("");
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(error.message);
        setSession(data.session);
        setAuthReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setAuthError(error.message || "Could not check your sign-in status.");
        setAuthReady(true);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  }

  return { session, authReady, authError, setAuthError, signOut };
}
