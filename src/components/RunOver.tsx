import { useState, type FormEvent } from "react";
import type { RunOutcome } from "../run";
import type { RunState } from "../types";

interface RunOverProps {
  run: RunState;
  outcome: RunOutcome;
  onNewRun: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export function RunOver({ run, outcome, onNewRun, onSubmit }: RunOverProps) {
  const [name, setName] = useState(run.hallOfFame?.name ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || run.hallOfFame?.submitted) return;
    const trimmed = name.trim();
    if (!trimmed || [...trimmed].length > 30) {
      setError("Name must be between 1 and 30 characters.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await onSubmit(trimmed);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not submit this run.");
    } finally {
      setSending(false);
    }
  }

  const victory = outcome === "victory";
  return (
    <section
      className={`mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-lg border-2 bg-panel p-8 text-center ${victory ? "border-gold" : "border-life"}`}
    >
      <p className="text-6xl" aria-hidden>
        {victory ? "👑" : "🪦"}
      </p>
      <h2 className="font-display text-3xl font-bold">{victory ? "Champion of the arena!" : "Your run is over"}</h2>
      <p className="text-muted">
        {run.wins} {run.wins === 1 ? "win" : "wins"} in {run.round} {run.round === 1 ? "round" : "rounds"}, {run.lives}{" "}
        {run.lives === 1 ? "life" : "lives"} left.
      </p>
      {run.hallOfFame?.submitted ? (
        <p role="status">Saved to the Hall of Fame as {run.hallOfFame.name}.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 text-left">
          <label htmlFor="player-name" className="font-bold">Hall of Fame name</label>
          <input
            id="player-name"
            value={name}
            onChange={(event) => { setName(event.target.value); setError(""); }}
            disabled={sending}
            required
            className="rounded-md border border-panel-edge bg-ink px-3 py-2"
          />
          {error && <p role="alert" className="text-parchment">{error}</p>}
          <button type="submit" disabled={sending} className="rounded-md border border-gold px-4 py-2 font-bold text-gold disabled:opacity-60">
            {sending ? "Submitting…" : "Submit to Hall of Fame"}
          </button>
        </form>
      )}
      <button type="button" onClick={onNewRun} className="rounded-md bg-gold px-5 py-2 font-display font-bold text-ink hover:brightness-110">
        🎒 New run
      </button>
    </section>
  );
}
