import { useState } from "react";
import { supabase } from "../../lib/supabase.js";

// Supabase validates credentials and applies the project's email-confirmation policy.
export default function AuthPanel({ initialError }) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage("Check your email to confirm your account, then sign in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (requestError) {
      setError(requestError.message || "Could not authenticate. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <a className="brand" href="/" aria-label="Margin home">
        <span className="brand-mark">m.</span>
        <span>margin</span>
      </a>
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="section-label">YOUR PRIVATE WORKSPACE</span>
        <h1 id="auth-title">{mode === "sign-in" ? "Welcome back." : "Make room for your thoughts."}</h1>
        <p>Sign in to access your notes from any device.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="form-message error-state" role="alert">{error}</p>}
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="button button-primary auth-submit" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError("");
            setMessage("");
          }}
        >
          {mode === "sign-in" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
