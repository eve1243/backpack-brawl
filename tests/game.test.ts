import { describe, expect, it } from "vitest";
import { advanceReplay, leaveBattle, newGame, skipReplay, startBattle, startSearch, updateRun } from "../src/game";
import { opponentForRound } from "../server/opponents.js";
import { moveItem, rerollShop } from "../src/run";

describe("B1 shop phase protection", () => {
  it("allows a reroll in the shop", () => {
    const game = newGame(123);
    const result = updateRun(game, rerollShop);

    expect(result.run.gold).toBe(game.run.gold - 1);
  });

  it("does not reroll while searching", () => {
    const game = newGame(123);
    const searching = { ...game, phase: "searching" as const };

    const result = updateRun(searching, rerollShop);

    expect(result).toBe(searching);
  });
});

// ------ B2 Backpack arrangement phase protection ------
describe("B2 backpack phase protection", () => {
  it("allows a backpack move while shopping", () => {
    const game = newGame(123);
    game.run.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };

    const result = updateRun(game, (run) => moveItem(run, 0, 3));

    expect(result.run.backpack[0]).toBeNull();
    expect(result.run.backpack[3]?.uid).toBe("item-1");
  });

  it("does not move a backpack item while searching", () => {
    const game = newGame(123);
    game.run.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };
    const searching = { ...game, phase: "searching" as const };

    const result = updateRun(searching, (run) => moveItem(run, 0, 3));

    expect(result).toBe(searching);
  });
});

it("scores a status-effect battle the same after Skip or playback and clears poison for the next battle", () => {
  const game = newGame(123);
  game.run.backpack[0] = { uid: "item-1", itemId: "viper-fang" };
  game.run.backpack[1] = { uid: "item-2", itemId: "healing-herb" };
  game.run.nextUid = 3;
  const first = startBattle(startSearch(game), opponentForRound(1));
  const skipped = skipReplay(first);
  let played = first;
  for (let frame = 1; frame < first.battle!.result.frames.length; frame++) {
    played = advanceReplay(played);
  }

  expect(played).toEqual(skipped);
  expect(advanceReplay(skipped)).toBe(skipped);
  expect(played.battle!.result.frames.at(-1)!.opponent.statuses.poison).toBeGreaterThan(0);
  const nextShop = leaveBattle(played);
  expect(nextShop.run.round).toBe(2);
  const next = startBattle(startSearch(nextShop), opponentForRound(2));
  expect(next.battle!.result.frames[0].player.statuses.poison).toBe(0);
  expect(next.battle!.result.frames[0].opponent.statuses.poison).toBe(0);
});
