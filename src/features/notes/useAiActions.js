import { useState } from "react";

// Keep AI request/result state out of the editor and attach the session token for server verification.
export function useAiActions(session, note) {
  const [result, setResult] = useState("");
  const [activeAction, setActiveAction] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function runAction(action) {
    setActiveAction(action);
    setError("");
    setResult("");

    try {
      const response = await fetch(`/api/notes/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
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

  return { result, activeAction, error, copied, runAction, copyResult };
}
