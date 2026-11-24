import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newGame, routeForGame, startBattle } from "../src/game";
import {
  loadSavedGame,
  loadSavedGameResult,
  SAVE_KEY,
  saveGame,
} from "../src/state/save";

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

describe("B4 Burn in saved replays", () => {
  function fireReplay() {
    const game = newGame(123);
    game.run.backpack[0] = { uid: "item-1", itemId: "pot-lid" };
    game.run.nextUid = 2;
    const battleGame = startBattle(game, {
      id: "fire-opponent", name: "Fire Opponent", icon: "🔥", hp: 40, round: 1,
      items: ["ember-torch", "cinder-blade"],
    });
    battleGame.battle!.frame = 4;
    return battleGame;
  }

  it("resumes on the recorded frame with the original stacks and outcome", () => {
    const game = fireReplay();
    expect(game.battle!.result.frames[4].player.statuses.burn).toBe(2);
    saveGame(game);
    expect(loadSavedGame()).toEqual(game);
  });

  it.each([-1, 1.5, null, "2", undefined])("rejects an invalid Burn count (%s) in a new replay", (burn) => {
    saveGame(fireReplay());
    const save = JSON.parse(storedValue!);
    save.game.battle.result.frames[4].player.statuses.burn = burn;
    storedValue = JSON.stringify(save);
    expect(loadSavedGame()).toBeNull();
  });

  it("restores pre-Burn snapshots with zero stacks and preserves replay progress", () => {
    const game = startBattle(newGame(123), {
      id: "old-opponent", name: "Old Opponent", icon: "🐢", hp: 40, round: 1, items: ["bitter-root"],
    });
    game.battle!.frame = 8;
    storedValue = JSON.stringify({ version: 1, game }, (key, value) => key === "burn" ? undefined : value);
    expect(loadSavedGame()).toEqual(game);
  });
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
    expect(restored?.search).toBeNull();
  });

  it("does not restore an invalid JSON save", () => {
    storedValue = "{ broken json";

    const result = loadSavedGameResult();

    expect(result.game).toBeNull();
    expect(result.message).toBe(
      "The saved run could not be read and has been discarded.",
    );
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

  it("does not restore a battle frame outside the replay", () => {
    const game = newGame(123);
    game.run.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };
    const battleGame = startBattle(game, {
      id: "test-opponent",
      name: "Test Opponent",
      icon: "🐢",
      hp: 25,
      round: 1,
      items: ["chipped-dagger"],
    });

    battleGame.battle!.frame = 999;
    saveGame(battleGame);

    expect(loadSavedGame()).toBeNull();
  });

  it("does not restore a battle for a different round", () => {
    const game = newGame(123);
    game.run.round = 3;
    game.run.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };
    const battleGame = startBattle(game, {
      id: "test-opponent",
      name: "Test Opponent",
      icon: "🐢",
      hp: 25,
      round: 1,
      items: ["chipped-dagger"],
    });

    saveGame(battleGame);

    expect(loadSavedGame()).toBeNull();
  });

  it("restores a finished victory and rejects an unfinished finished state", () => {
    const victory = newGame(123);
    victory.phase = "finished";
    victory.run.wins = 5;
    saveGame(victory);

    expect(loadSavedGame()?.phase).toBe("finished");

    const unfinished = newGame(123);
    unfinished.phase = "finished";
    unfinished.run.wins = 2;
    saveGame(unfinished);

    expect(loadSavedGame()).toBeNull();
  });

  it("restores a finished defeat", () => {
    const defeat = newGame(123);
    defeat.phase = "finished";
    defeat.run.lives = 0;
    saveGame(defeat);

    expect(loadSavedGame()?.phase).toBe("finished");
  });

  it("maps finished runs to the result screen", () => {
    const game = newGame(123);
    game.phase = "finished";
    game.run.wins = 5;

    expect(routeForGame(game)).toBe("/result");
  });

  it("rejects unknown item ids", () => {
    const game = newGame(123);
    game.run.backpack[0] = { uid: "item-1", itemId: "unknown-item" };
    saveGame(game);

    expect(loadSavedGame()).toBeNull();
  });

  it("rejects duplicate backpack uids", () => {
    const game = newGame(123);
    game.run.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };
    game.run.backpack[2] = { uid: "item-1", itemId: "pot-lid" };
    saveGame(game);

    expect(loadSavedGame()).toBeNull();
  });

  it("rejects a wrong backpack array size", () => {
    const game = newGame(123);
    const invalidGame = {
      ...game,
      run: {
        ...game.run,
        backpack: [null],
      },
    };
    storedValue = JSON.stringify({
      version: 1,
      game: invalidGame,
      savedAt: Date.now(),
    });

    expect(loadSavedGame()).toBeNull();
  });

  it("rejects a battle without replay frames", () => {
    const game = newGame(123);
    const invalidBattleGame = {
      ...game,
      phase: "battle",
      run: {
        ...game.run,
        backpack: game.run.backpack,
      },
      battle: {
        frame: 0,
        opponent: {},
        player: {},
        enemy: {},
        result: {
          frames: [],
        },
      },
    };
    storedValue = JSON.stringify({
      version: 1,
      game: invalidBattleGame,
      savedAt: Date.now(),
    });

    expect(loadSavedGame()).toBeNull();
  });

  it("rejects negative poison stacks in a battle frame", () => {
    const game = newGame(123);
    game.run.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };

    const battleGame = startBattle(game, {
      id: "test-opponent",
      name: "Test Opponent",
      icon: "🐢",
      hp: 25,
      round: 1,
      items: ["bitter-root"],
    });

    if (battleGame.battle) {
      battleGame.battle.result.frames[0].opponent.statuses.poison = -1;
    }

    saveGame(battleGame);

    expect(loadSavedGame()).toBeNull();
  });

  it("stores the save under the B6 save key", () => {
    saveGame(newGame(123));

    expect(localStorage.setItem).toHaveBeenCalledWith(
      SAVE_KEY,
      expect.any(String),
    );
  });
});
