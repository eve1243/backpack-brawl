import { submitRun } from "../api";
import { RunHeader } from "../components/RunHeader";
import { RunOver } from "../components/RunOver";
import { runOutcome } from "../run";
import { useActiveGame } from "../state/GameContext";

export function ResultPage() {
  const { game, update, startNewRun } = useActiveGame();
  const outcome = runOutcome(game.run);
  if (!outcome) return null;

  function rememberSubmission(name: string, submitted: boolean) {
    update((current) => {
      if (current.run.runId !== game.run.runId || current.run.hallOfFame?.submitted) return current;
      return { ...current, run: { ...current.run, hallOfFame: { name, submitted } } };
    });
  }

  // Starting a new run moves the phase to "shop", so RequireRoute redirects to the shop.
  return (
    <>
      <RunHeader run={game.run} />
      <RunOver
        key={game.run.runId}
        run={game.run}
        outcome={outcome}
        onNewRun={startNewRun}
        onSubmit={async (name) => {
          rememberSubmission(name, false);
          await submitRun(game.run, outcome, name);
          rememberSubmission(name, true);
        }}
      />
    </>
  );
}
