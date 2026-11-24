import type { Opponent } from "./types";

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
