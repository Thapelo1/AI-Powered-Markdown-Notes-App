import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireUser } from "../middleware/requireUser.js";

// Keep AI validation, account throttling, and provider calls together as one API feature.
export function createNotesRouter({ supabase, openai, model }) {
  const router = Router();
  // shortcut: the quota is process-local; use shared storage before running multiple server instances.
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.authUser.id,
    message: { error: "Too many AI requests. Please wait a few minutes and try again." },
  });

  router.post("/:action", requireUser(supabase), aiLimiter, async (req, res) => {
    const { action } = req.params;
    const { content } = req.body ?? {};

    if (!["summarize", "rewrite"].includes(action)) {
      return res.status(400).json({ error: "Choose summarize or rewrite." });
    }
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Add some note text first." });
    }
    if (content.length > 20000) {
      return res.status(413).json({ error: "Notes must be 20,000 characters or fewer." });
    }
    if (!openai) {
      return res.status(503).json({ error: "AI actions are not configured on the server." });
    }

    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              action === "summarize"
                ? "Summarize the user's markdown notes clearly and concisely. Preserve key facts and use markdown when helpful."
                : "Rewrite the user's markdown notes for clarity and flow. Preserve their meaning, facts, and markdown structure.",
          },
          { role: "user", content: content.trim() },
        ],
      });

      const result = response?.choices?.[0]?.message?.content?.trim();
      if (!result) {
        throw new Error("The AI provider returned an empty response.");
      }

      return res.json({ result });
    } catch (error) {
      const status = error?.status ?? error?.statusCode;
      const code = error?.code ?? error?.type;
      console.error("OpenAI request failed:", {
        status,
        code,
        message: error?.message,
      });

      if (status === 401 || status === 403 || code === "invalid_api_key") {
        return res.status(502).json({ error: "The AI provider rejected its server credentials. Check OPENAI_API_KEY." });
      }
      if (status === 429) {
        return res.status(429).json({ error: "The AI provider is busy or out of quota. Please try again later." });
      }
      if (status === 408 || code === "timeout" || code === "ETIMEDOUT") {
        return res.status(504).json({ error: "The AI request timed out. Please try again." });
      }
      return res.status(502).json({ error: "The AI request failed. Please try again." });
    }
  });

  return router;
}
