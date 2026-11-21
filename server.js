import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { createNotesRouter } from "./server/routes/notes.js";

// Bootstrap shared clients and HTTP middleware.
const app = express();
const port = process.env.PORT || 3001;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      // Supabase auth/database calls are allowed only to the configured project origin.
      connectSrc: ["'self'", supabaseUrl ? new URL(supabaseUrl).origin : ""].filter(Boolean),
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(express.json({ limit: "100kb" }));
app.get("/healthz", (_req, res) => {
  const ready = Boolean(supabase);
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "not_ready" });
});
// Mount the disabled AI endpoint before the generic API 404 and static app fallback.
app.use("/api/notes", createNotesRouter());
app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found." }));

if (existsSync("dist/index.html")) {
  app.use(express.static("dist"));
  app.get("*", (_req, res) => res.sendFile("index.html", { root: "dist" }));
}

app.listen(port, () => {
  console.log(`Notes API listening on http://localhost:${port}`);
});
