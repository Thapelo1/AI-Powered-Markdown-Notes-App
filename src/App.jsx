import { useEffect, useRef, useState } from "react";
import AuthPanel from "./features/auth/AuthPanel.jsx";
import { useAuthSession } from "./features/auth/useAuthSession.js";
import { useAccountNote } from "./features/notes/useAccountNote.js";
import { NOTE_LIMIT, supabase } from "./lib/supabase.js";

function AiActionWorkspace({
  session,
  note,
  setNote,
  savedNote,
  restoreSavedNote,
  noteReady,
  importing,
}) {
  const [aiAction, setAiAction] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const requestRef = useRef(null);

  useEffect(() => {
    const request = requestRef.current;
    if (request && request.note !== note) {
      request.controller.abort();
      requestRef.current = null;
    }
    setAiAction((current) => current?.note === note ? current : null);
    setAiResult((current) => current?.note === note ? current : null);
    setAiError((current) => current?.note === note ? current : null);
  }, [note]);

  useEffect(() => () => {
    requestRef.current?.controller.abort();
    requestRef.current = null;
  }, []);

  const currentAiAction = aiAction?.note === note ? aiAction.action : null;
  const currentAiResult = aiResult?.note === note ? aiResult.result : "";
  const currentAiError = aiError?.note === note ? aiError.message : "";
  const aiBusy = Boolean(requestRef.current);

  async function runAiAction(action) {
    if (requestRef.current || !note.trim()) return;

    const controller = new AbortController();
    const request = { controller, note };
    requestRef.current = request;
    setAiAction({ note, action });
    setAiResult(null);
    setAiError(null);
    try {
      const response = await fetch(`/api/notes/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note }),
        signal: controller.signal,
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
      if (requestRef.current !== request || controller.signal.aborted) return;
      setAiResult({ note, result: payload.result });
    } catch (error) {
      if (requestRef.current === request && !controller.signal.aborted) {
        setAiError({ note, message: error instanceof Error ? error.message : "AI action failed. Try again." });
      }
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setAiAction(null);
      }
    }
  }

  return (
    <>
      <div className="panels">
        <section className="panel editor-panel" aria-label="Markdown note editor">
          <div className="panel-header">
            <span className="panel-title"><span className="dot dot-green" /> Note</span>
            <span className="word-count">{note.trim() ? note.trim().split(/\s+/).length : 0} words</span>
          </div>
          <textarea
            aria-label="Write your markdown note"
            placeholder={"# Your next big idea\n\nStart with a thought, a meeting note, or a messy first draft.\n\nMarkdown works here, too:\n- Add a list\n- **Emphasize** what matters"}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setAiResult(null);
              setAiError(null);
            }}
            spellCheck="false"
            maxLength={NOTE_LIMIT}
            disabled={!noteReady || importing || aiBusy}
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
          {currentAiAction ? (
            <div className="result-empty" role="status">
              <span className="loader" aria-hidden="true" />
              <p>{currentAiAction === "rewrite" ? "Rewriting your note…" : "Summarizing your note…"}</p>
            </div>
          ) : currentAiError ? (
            <p className="storage-error" role="alert">{currentAiError}</p>
          ) : currentAiResult ? (
            <div className="result-content">{currentAiResult}</div>
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
          <button className="button button-secondary" disabled={!noteReady || !note.trim() || aiBusy || importing} onClick={() => runAiAction("rewrite")}>
            <span className="rewrite-icon">↗</span> {currentAiAction === "rewrite" ? "Rewriting…" : "Rewrite"}
          </button>
          <button className="button button-primary" disabled={!noteReady || !note.trim() || aiBusy || importing} onClick={() => runAiAction("summarize")}>
            <span>✳</span> {currentAiAction === "summarize" ? "Summarizing…" : "Summarize"}
          </button>
        </div>
      </div>
    </>
  );
}

// Compose feature state into the three app-level views: setup, sign-in, and the note workspace.
export default function App() {
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

        <AiActionWorkspace
          key={session.user.id}
          session={session}
          note={note}
          setNote={setNote}
          savedNote={savedNote}
          restoreSavedNote={restoreSavedNote}
          noteReady={noteReady}
          importing={importing}
        />
        <footer className="page-footer"><span>Made for the thoughts that deserve a second look.</span><span>Notes are stored in Supabase; AI actions send them to OpenAI and may be billed.</span></footer>
      </section>
    </main>
  );
}
