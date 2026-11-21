import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import { existsSync } from "node:fs";

const app = express();
const port = process.env.PORT || 3001;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

app.use(express.json({ limit: "100kb" }));

app.post("/api/notes/:action", async (req, res) => {
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
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "Add your OpenAI API key to .env to use AI actions." });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model,
      instructions:
        action === "summarize"
          ? "Summarize the user's markdown notes clearly and concisely. Preserve key facts and use markdown when helpful."
          : "Rewrite the user's markdown notes for clarity and flow. Preserve their meaning, facts, and markdown structure.",
      input: content.trim(),
    });

    res.json({ result: response.output_text });
  } catch (error) {
    console.error("OpenAI request failed:", error.message);
    res.status(502).json({ error: "The AI request failed. Check your API key and try again." });
  }
});

if (existsSync("dist/index.html")) {
  app.use(express.static("dist"));
  app.get("*", (_req, res) => res.sendFile("index.html", { root: "dist" }));
}

app.listen(port, () => {
  console.log(`Notes API listening on http://localhost:${port}`);
});
