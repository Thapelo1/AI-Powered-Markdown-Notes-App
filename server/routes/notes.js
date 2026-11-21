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
      const response = await openai.responses.create({
        model,
        instructions:
          action === "summarize"
            ? "Summarize the user's markdown notes clearly and concisely. Preserve key facts and use markdown when helpful."
            : "Rewrite the user's markdown notes for clarity and flow. Preserve their meaning, facts, and markdown structure.",
        input: content.trim(),
      });

      return res.json({ result: response.output_text });
    } catch (error) {
      console.error("OpenAI request failed:", error.message);
      return res.status(502).json({ error: "The AI request failed. Check the server configuration and try again." });
    }
  });

  return router;
}
