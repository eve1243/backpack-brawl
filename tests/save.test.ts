import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newGame, startBattle } from "../src/game";
import { loadSavedGame, SAVE_KEY, saveGame } from "../src/state/save";

let storedValue: string | null;

beforeEach(() => {
  storedValue = null;

  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => storedValue),
    setItem: vi.fn((_key: string, value: string) => {
      storedValue = value;
    }),
    removeItem: vi.fn(() => {
      storedValue = null;
    }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ------ B6 Save and resume tests ------
describe("B6 save and resume", () => {
  it("returns null when no save exists", () => {
    expect(loadSavedGame()).toBeNull();
  });

  it("saves and restores a shop run", () => {
    const game = newGame(123);
    game.run.gold = 7;
    game.run.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };
    game.run.backpack[2] = { uid: "item-2", itemId: "pot-lid" };

    saveGame(game);
    const restored = loadSavedGame();

    expect(restored).not.toBeNull();
    expect(restored?.run.gold).toBe(7);
    expect(restored?.run.backpack[0]?.uid).toBe("item-1");
    expect(restored?.run.backpack[2]?.uid).toBe("item-2");
  });

  it("returns a searching game safely to the shop", () => {
    const game = newGame(123);
    const searching = { ...game, phase: "searching" as const };

    saveGame(searching);
    const restored = loadSavedGame();

    expect(restored?.phase).toBe("shop");
  });

  it("does not restore an invalid JSON save", () => {
    storedValue = "{ broken json";

    expect(loadSavedGame()).toBeNull();
  });

  it("does not restore a save with invalid run values", () => {
    const game = newGame(123);
    const invalidGame = {
      ...game,
      run: {
        ...game.run,
        gold: -10,
      },
    };
    storedValue = JSON.stringify({
      version: 1,
      game: invalidGame,
      savedAt: Date.now(),
    });

    expect(loadSavedGame()).toBeNull();
  });

  it("restores a battle and its replay frame", () => {
    const opponent = {
      id: "test-opponent",
      name: "Test Opponent",
      icon: "🐢",
      hp: 25,
      round: 1,
      items: ["chipped-dagger"],
    };
    const game = newGame(123);
    game.run.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };

    const battleGame = startBattle(game, opponent);
    battleGame.battle!.frame = 3;

    saveGame(battleGame);
    const restored = loadSavedGame();

    expect(restored?.phase).toBe("battle");
    expect(restored?.battle?.opponent.id).toBe("test-opponent");
    expect(restored?.battle?.frame).toBe(3);
  });

  it("stores the save under the B6 save key", () => {
    saveGame(newGame(123));

    expect(localStorage.setItem).toHaveBeenCalledWith(
      SAVE_KEY,
      expect.any(String),
    );
  });
});
