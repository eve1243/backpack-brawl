import { describe, expect, it } from "vitest";
import { newGame, updateRun } from "../src/game";
import { rerollShop } from "../src/run";

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
