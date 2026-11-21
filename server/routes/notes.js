import { Router } from "express";

export function createNotesRouter() {
  const router = Router();
  router.post("/:action", (_req, res) =>
    res.status(503).json({ error: "AI actions are disabled to avoid paid API usage." }),
  );

  return router;
}
