import { describe, expect, it } from "vitest";
import { newGame, showFrame, startBattle, updateRun } from "../src/game";
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

// ------ B6 replay result protection ------
describe("B6 replay result protection", () => {
  it("applies a battle result only once", () => {
    const game = newGame(123);
    game.run.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };
    const battling = startBattle(game, {
      id: "test-opponent",
      name: "Test Opponent",
      icon: "🐢",
      hp: 25,
      round: 1,
      items: ["chipped-dagger"],
    });

    const finished = showFrame(battling, Infinity);
    const shownAgain = showFrame(finished, Infinity);

    expect(shownAgain.run.wins).toBe(finished.run.wins);
    expect(shownAgain.run.lives).toBe(finished.run.lives);
  });
});
