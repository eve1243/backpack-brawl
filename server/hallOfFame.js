import express from "express";

export const hallOfFame = express.Router();
const entries = new Map();
const runIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateRun(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Expected a JSON object.";
  const { runId, name, outcome, wins, rounds } = body;

  if (typeof runId !== "string" || !runIdPattern.test(runId)) return "runId must be a version 4 UUID.";
  if (typeof name !== "string" || !name.trim() || [...name.trim()].length > 30) {
    return "Name must be between 1 and 30 characters.";
  }
  if (!Number.isInteger(wins) || !Number.isInteger(rounds)) return "Wins and rounds must be whole numbers.";

  if (outcome === "victory") {
    if (wins !== 5 || rounds < 5 || rounds > 7) return "A victory requires 5 wins in 5 to 7 rounds.";
  } else if (outcome === "defeat") {
    if (wins < 0 || wins > 4 || rounds !== wins + 3) return "A defeat requires 0 to 4 wins and exactly 3 losses.";
  } else {
    return "Outcome must be victory or defeat.";
  }
  return null;
}

hallOfFame.get("/", (_req, res) => {
  const ranked = [...entries.values()].sort((a, b) => {
    if (a.outcome !== b.outcome) return a.outcome === "victory" ? -1 : 1;
    if (a.wins !== b.wins) return b.wins - a.wins;
    // A complete tie keeps the Map's insertion order because Array.sort is stable.
    return a.rounds - b.rounds;
  });
  res.json(ranked);
});

hallOfFame.post("/", express.json(), (req, res) => {
  const error = validateRun(req.body);
  if (error) return res.status(400).json({ error });

  const runId = req.body.runId.toLowerCase();
  const name = req.body.name.trim();
  const { outcome, wins, rounds } = req.body;
  const previous = entries.get(runId);
  if (previous) {
    if (previous.name === name && previous.outcome === outcome && previous.wins === wins && previous.rounds === rounds) {
      return res.json(previous);
    }
    return res.status(409).json({ error: "This run was already submitted with different data." });
  }

  const entry = { runId, name, outcome, wins, rounds, createdAt: new Date().toISOString() };
  entries.set(runId, entry);
  return res.status(201).json(entry);
});

hallOfFame.use((error, _req, res, next) => {
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Expected valid JSON." });
  if (error.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });
  return next(error);
});
