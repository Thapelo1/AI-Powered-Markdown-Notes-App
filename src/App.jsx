import { useEffect, useState } from "react";

const STORAGE_KEY = "margin-note";

export default function App() {
  const [note, setNote] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [result, setResult] = useState("");
  const [activeAction, setActiveAction] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, note);
  }, [note]);

  async function runAction(action) {
    setActiveAction(action);
    setError("");
    setResult("");

    try {
      const response = await fetch(`/api/notes/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data.result);
    } catch (requestError) {
      setError(requestError.message || "Could not reach the notes API.");
    } finally {
      setActiveAction("");
    }
  }

  async function copyResult() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Margin home">
          <span className="brand-mark">m.</span>
          <span>margin</span>
        </a>
        <div className="topbar-right">
          <span className="saved-indicator"><span /> Saved on this device</span>
          <span className="avatar" aria-label="Your workspace">T</span>
        </div>
      </header>

      <section className="workspace">
        <div className="intro">
          <div className="eyebrow"><span className="sparkle">✳</span> YOUR THOUGHTS, IN GOOD COMPANY</div>
          <h1>A little more clarity.</h1>
          <p>Write it out. Then make it clearer with a little help from AI.</p>
        </div>

        <div className="workspace-heading">
          <div>
            <span className="section-label">YOUR WORKSPACE</span>
            <h2>Untitled note</h2>
          </div>
          <span className="markdown-badge"><span>#</span> Markdown</span>
        </div>

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
              onChange={(event) => setNote(event.target.value)}
              spellCheck="false"
            />
            <div className="editor-footer">
              <span>Changes save as you type</span>
              <span>Markdown supported</span>
            </div>
          </section>

          <section className={`panel result-panel${result ? " has-result" : ""}`} aria-label="AI result" aria-live="polite">
            <div className="panel-header">
              <span className="panel-title"><span className="dot dot-purple" /> AI companion</span>
              {result && <button className="copy-button" onClick={copyResult}>{copied ? "Copied" : "Copy"}</button>}
            </div>
            {activeAction ? (
              <div className="result-empty loading-state">
                <span className="loader" />
                <span>{activeAction === "summarize" ? "Finding the main ideas…" : "Polishing your note…"}</span>
              </div>
            ) : error ? (
              <div className="result-empty error-state">
                <span className="result-icon">!</span>
                <p>{error}</p>
              </div>
            ) : result ? (
              <div className="result-content">{result}</div>
            ) : (
              <div className="result-empty">
                <span className="result-icon">✳</span>
                <p>Your clearer thoughts<br />will show up here.</p>
                <span className="result-hint">Choose an action below to get started</span>
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
            <button className="button button-secondary" disabled={!note.trim() || Boolean(activeAction)} onClick={() => runAction("rewrite")}>
              <span className="rewrite-icon">↗</span> Rewrite
            </button>
            <button className="button button-primary" disabled={!note.trim() || Boolean(activeAction)} onClick={() => runAction("summarize")}>
              <span>✳</span> Summarize
            </button>
          </div>
        </div>
        <footer className="page-footer"><span>Made for the thoughts that deserve a second look.</span><span>AI can make mistakes. Your notes stay yours.</span></footer>
      </section>
    </main>
  );
}
