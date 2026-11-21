import { useState } from "react";
import AuthPanel from "./features/auth/AuthPanel.jsx";
import { useAuthSession } from "./features/auth/useAuthSession.js";
import { useAccountNote } from "./features/notes/useAccountNote.js";
import { NOTE_LIMIT, supabase } from "./lib/supabase.js";

// Compose feature state into the three app-level views: setup, sign-in, and the note workspace.
export default function App() {
  const [aiAction, setAiAction] = useState(null);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");
  const { session, authReady, authError, setAuthError, signOut } = useAuthSession();
  const {
    note,
    setNote,
    savedNote,
    restoreSavedNote,
    noteReady,
    noteStatus,
    noteError,
    showImport,
    importing,
    importLegacyNote,
  } = useAccountNote(session);

  async function runAiAction(action) {
    if (aiAction || !note.trim()) return;

    setAiAction(action);
    setAiResult("");
    setAiError("");
    try {
      const response = await fetch(`/api/notes/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note }),
      });
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`AI request failed (${response.status}).`);
      }
      if (!response.ok) throw new Error(payload.error || `AI request failed (${response.status}).`);
      if (typeof payload.result !== "string" || !payload.result.trim()) {
        throw new Error("The AI returned an empty response. Try again.");
      }
      setAiResult(payload.result);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI action failed. Try again.");
    } finally {
      setAiAction(null);
    }
  }

  if (!supabase) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Supabase setup needed.</h1>
          <p>Add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values to your environment, then restart the app.</p>
        </section>
      </main>
    );
  }

  if (!authReady) {
    return <main className="auth-page"><p role="status">Checking your sign-in…</p></main>;
  }

  if (!session) return <AuthPanel initialError={authError} />;

  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;
  const saveLabel = {
    loading: "Loading note…",
    saving: "Saving to your account…",
    saved: "Saved to your account",
    error: "Save needs attention",
    idle: "Not signed in",
  }[noteStatus];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Margin home">
          <span className="brand-mark">m.</span>
          <span>margin</span>
        </a>
        <div className="topbar-right">
          <span className="saved-indicator" aria-live="polite"><span />{saveLabel}</span>
          <span className="account-email">{session.user.email}</span>
          <button className="auth-switch sign-out" onClick={async () => {
            try {
              await signOut();
            } catch (signOutError) {
              setAuthError(signOutError.message || "Could not sign out.");
            }
          }}>Sign out</button>
        </div>
      </header>

      <section className="workspace">
        <div className="intro">
          <div className="eyebrow"><span className="sparkle">✳</span> YOUR THOUGHTS, IN GOOD COMPANY</div>
          <h1>A little more clarity.</h1>
          <p>Write it out, keep it close, and come back anytime.</p>
        </div>

        <div className="workspace-heading">
          <div>
            <span className="section-label">YOUR WORKSPACE</span>
            <h2>Untitled note</h2>
          </div>
          <span className="markdown-badge"><span>#</span> Markdown</span>
        </div>

        {authError && <p className="storage-error" role="alert">{authError}</p>}
        {showImport && (
          <div className="import-notice" role="status">
            <span>A note saved in this browser was found.</span>
            <button className="copy-button" disabled={importing} onClick={importLegacyNote}>
              {importing ? "Importing…" : "Import to this account"}
            </button>
          </div>
        )}
        {noteError && <p className="storage-error" role="alert">{noteError}</p>}

        <div className="panels">
          <section className="panel editor-panel" aria-label="Markdown note editor">
            <div className="panel-header">
              <span className="panel-title"><span className="dot dot-green" /> Note</span>
              <span className="word-count">{wordCount} words</span>
            </div>
            <textarea
              aria-label="Write your markdown note"
              placeholder={"# Your next big idea\n\nStart with a thought, a meeting note, or a messy first draft.\n\nMarkdown works here, too:\n- Add a list\n- **Emphasize** what matters"}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setAiResult("");
                setAiError("");
              }}
              spellCheck="false"
              maxLength={NOTE_LIMIT}
              disabled={!noteReady || importing || Boolean(aiAction)}
            />
            <div className="editor-footer">
              <span>Changes save to your account</span>
              {savedNote && !note.trim() && (
                <button className="copy-button" onClick={restoreSavedNote}>Restore saved note</button>
              )}
              <span>{NOTE_LIMIT - note.length} characters left</span>
            </div>
          </section>

          <section className="panel result-panel" aria-label="AI companion" aria-live="polite">
            <div className="panel-header">
              <span className="panel-title"><span className="dot dot-purple" /> AI companion</span>
            </div>
            {aiAction ? (
              <div className="result-empty" role="status">
                <span className="loader" aria-hidden="true" />
                <p>{aiAction === "rewrite" ? "Rewriting your note…" : "Summarizing your note…"}</p>
              </div>
            ) : aiError ? (
              <p className="storage-error" role="alert">{aiError}</p>
            ) : aiResult ? (
              <div className="result-content">{aiResult}</div>
            ) : (
              <div className="result-empty">
                <span className="result-icon">✳</span>
                <p>Rewrite for clarity or summarize your note.</p>
                <p className="result-hint">Your note is sent to OpenAI only when you choose an action. API usage may be billed.</p>
              </div>
            )}
          </section>
        </div>

        <div className="action-row">
          <div className="action-copy">
            <span className="action-sparkle">✳</span>
            <span><strong>Make it yours.</strong> Your original note stays untouched.</span>
          </div>
          <div className="actions">
            <button className="button button-secondary" disabled={!noteReady || !note.trim() || Boolean(aiAction) || importing} onClick={() => runAiAction("rewrite")}>
              <span className="rewrite-icon">↗</span> {aiAction === "rewrite" ? "Rewriting…" : "Rewrite"}
            </button>
            <button className="button button-primary" disabled={!noteReady || !note.trim() || Boolean(aiAction) || importing} onClick={() => runAiAction("summarize")}>
              <span>✳</span> {aiAction === "summarize" ? "Summarizing…" : "Summarize"}
            </button>
          </div>
        </div>
        <footer className="page-footer"><span>Made for the thoughts that deserve a second look.</span><span>Notes are stored in Supabase; AI actions send them to OpenAI and may be billed.</span></footer>
      </section>
    </main>
  );
}
