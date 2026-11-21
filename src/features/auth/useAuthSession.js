import { useEffect, useState } from "react";
import { getAuthErrorMessage, logUserEvent, supabase } from "../../lib/supabase.js";

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
        if (error) setAuthError(getAuthErrorMessage(error, "Could not check your sign-in status."));
        setSession(data.session);
        setAuthReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setAuthError(getAuthErrorMessage(error, "Could not check your sign-in status."));
        setAuthReady(true);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await logUserEvent("auth.signed_out");
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  }

  return { session, authReady, authError, setAuthError, signOut };
}
