import type { RunOutcome } from "./run";
import type { Opponent, RunState } from "./types";

/** Asks the API for this round's opponent; throws with the server's error text on failure. */
export async function fetchOpponent(round: number): Promise<Opponent> {
  const response = await fetch(`/api/opponents?round=${encodeURIComponent(round)}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Opponent search failed (${response.status})`);
  }

  const opponent = await response.json() as Opponent;
  if (opponent.round !== round) {
    throw new Error("The arena returned an opponent for the wrong round.");
  }

  return opponent;
}

export async function submitRun(run: RunState, outcome: RunOutcome, name: string): Promise<void> {
  const response = await fetch("/api/hall-of-fame", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId: run.runId, name, outcome, wins: run.wins, rounds: run.round }),
  });
  const entry = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(entry?.error ?? `Could not submit this run (${response.status}).`);
  }
  if (entry?.runId !== run.runId.toLowerCase() || entry.name !== name) {
    throw new Error("The arena did not confirm this run. Please try again.");
  }
}

export interface HallOfFameEntry {
  runId: string;
  name: string;
  outcome: RunOutcome;
  wins: number;
  rounds: number;
  createdAt: string;
}

export async function fetchHallOfFame(signal: AbortSignal): Promise<HallOfFameEntry[]> {
  const response = await fetch("/api/hall-of-fame", { signal });
  if (!response.ok) throw new Error(`Could not load the Hall of Fame (${response.status}).`);

  const entries = await response.json();
  if (!Array.isArray(entries) || !entries.every((entry) =>
    entry && typeof entry.runId === "string" && typeof entry.name === "string" &&
    (entry.outcome === "victory" || entry.outcome === "defeat") &&
    Number.isInteger(entry.wins) && Number.isInteger(entry.rounds) &&
    typeof entry.createdAt === "string" && Number.isFinite(Date.parse(entry.createdAt))
  )) {
    throw new Error("The arena returned an invalid ranking.");
  }
  return entries;
}
