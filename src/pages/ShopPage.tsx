import { fetchOpponent } from "../api";
import { Backpack } from "../components/Backpack";
import { FightBar } from "../components/FightBar";
import { RulesPanel } from "../components/RulesPanel";
import { RunHeader } from "../components/RunHeader";
import { Shop } from "../components/Shop";
import { finishSearch, fightBlocker, searchFailed, startSearch, updateRun } from "../game";
import { buyItem, needsRunReset, rerollShop, sellItem, moveItem } from "../run";
import { useActiveGame } from "../state/GameContext";

export function ShopPage() {
  const { game, update, startNewRun } = useActiveGame();
  const { run, phase } = game;

  function handleBuy(offerIndex: number) {
    update((current) => updateRun(current, (currentRun) => buyItem(currentRun, offerIndex)));
  }

  function handleSell(slotIndex: number) {
  update((current) =>
    updateRun(current, (currentRun) => sellItem(currentRun, slotIndex)),
    );
  }

  function handleReroll() {
  update((current) =>
    updateRun(current, (currentRun) => rerollShop(currentRun)),
    );
  }

  function handleMove(fromIndex: number, toIndex: number) {
    update((current) =>
      updateRun(current, (currentRun) =>
        moveItem(currentRun, fromIndex, toIndex),
      ),
    );
  }

  // Once the opponent is found the phase becomes "battle" and RequireRoute redirects to the battle page.
  async function handleFindOpponent() {
    if (fightBlocker(game) !== null) return;
    if (game.phase !== "shop") return;

    const searching = startSearch(game);
    const searchId = searching.search?.id;
    if (!searchId) return;

    update(() => searching);

    try {
      const opponent = await fetchOpponent(run.round);
      update((current) => finishSearch(current, searchId, opponent));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Opponent search failed.";
      update((current) => searchFailed(current, searchId, message));
    }
  }

  return (
    <>
      <RunHeader run={run} />
      {needsRunReset(run) && (
        <section role="alert" className="rounded-lg border border-life bg-panel p-4">
          <p className="mb-3 font-bold text-life">
            No Gold and no Item left. Click the button below to start a new run.
          </p>
          <button
            type="button"
            onClick={startNewRun}
            className="rounded-md bg-life px-4 py-2 font-bold text-parchment"
          >
            🔄 Run neu starten
          </button>
        </section>
      )}
      <FightBar
        phase={phase}
        searchActive={game.search !== null}
        blocker={fightBlocker(game)}
        error={game.error}
        onFight={handleFindOpponent}
      />

      {/* While searching, the whole shop/backpack area is disabled so the fighting build can't change. */}
      <fieldset disabled={phase !== "shop"} className="grid min-w-0 gap-4 disabled:opacity-60 lg:grid-cols-[1fr_16rem_18rem]">
        <Shop run={run} onBuy={handleBuy}  onReroll={handleReroll}/>
       <Backpack
        backpack={run.backpack}
        run={run}
        onSell={handleSell}
        onMove = {handleMove}
        />
        <aside className="flex flex-col gap-4">
          <RulesPanel open={run.round === 1} />
        </aside>
      </fieldset>
    </>
  );
}
