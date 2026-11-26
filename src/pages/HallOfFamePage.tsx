import { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchHallOfFame, type HallOfFameEntry } from "../api";
import { routeForGame } from "../game";
import { useGame } from "../state/GameContext";

export function HallOfFamePage() {
  const { game } = useGame();
  const [entries, setEntries] = useState<HallOfFameEntry[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchHallOfFame(controller.signal)
      .then((ranking) => {
        if (!controller.signal.aborted) setEntries(ranking);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load the Hall of Fame.");
      });
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setError("");
    setAttempt((current) => current + 1);
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-panel-edge bg-panel p-4 sm:p-6">
      <h2 className="font-display text-3xl font-bold text-gold">Hall of Fame</h2>
      <p className="text-muted">
        Victories come first, followed by most wins, then fewest rounds. Tied runs appear in the order they were submitted.
      </p>
      {error ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert">{error}</p>
          <button type="button" onClick={retry} className="rounded-md border border-gold px-3 py-1 font-bold text-gold">
            Try again
          </button>
        </div>
      ) : entries === null ? (
        <p role="status">Loading the ranking…</p>
      ) : entries.length === 0 ? (
        <p role="status">No runs have been submitted yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Finished runs in rank order</caption>
            <thead className="border-b border-panel-edge text-muted">
              <tr>
                {["Rank", "Name", "Result", "Wins", "Rounds", "Date"].map((label) => (
                  <th key={label} scope="col" className="px-2 py-2">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.runId} className="border-b border-panel-edge last:border-0">
                  <td className="p-2 tabular-nums">{index + 1}</td>
                  <th scope="row" className="p-2 wrap-anywhere">{entry.name}</th>
                  <td className="p-2">{entry.outcome === "victory" ? "Victory" : "Defeat"}</td>
                  <td className="p-2">{entry.wins}</td>
                  <td className="p-2">{entry.rounds}</td>
                  <td className="p-2"><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString()}</time></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {game && <Link className="self-start font-bold text-gold hover:underline" to={routeForGame(game)}>Back to run</Link>}
    </section>
  );
}
