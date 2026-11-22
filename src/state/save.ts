import { CATALOG } from "../items";
import type { GameState, RunState } from "../types";

const SAVE_KEY = "backpack-brawl-save";
const SAVE_VERSION = 1;

interface SavedGame {
  version: number;
  game: GameState;
  savedAt: number;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value);

const itemExists = (itemId: unknown): itemId is string =>
  typeof itemId === "string" && CATALOG.some((item) => item.id === itemId);

function validateRun(value: unknown): value is RunState {
  if (!isObject(value)) return false;

  const {
    round,
    gold,
    lives,
    wins,
    seed,
    shop,
    backpack,
    nextUid,
  } = value;

  if (!isInteger(round) || round < 1) return false;
  if (!isInteger(gold) || gold < 0) return false;
  if (!isInteger(lives) || lives < 0 || lives > 3) return false;
  if (!isInteger(wins) || wins < 0 || wins > 5) return false;
  if (!isInteger(seed) || seed < 0) return false;
  if (!isInteger(nextUid) || nextUid < 1) return false;

  if (!Array.isArray(shop) || shop.length !== 4) return false;
  if (!shop.every((itemId) => itemId === null || itemExists(itemId))) {
    return false;
  }

  if (!Array.isArray(backpack) || backpack.length !== 6) return false;

  const usedIds = new Set<string>();

  for (const slot of backpack) {
    if (slot === null) continue;
    if (!isObject(slot)) return false;
    if (typeof slot.uid !== "string" || typeof slot.itemId !== "string") {
      return false;
    }
    if (!itemExists(slot.itemId)) return false;
    if (usedIds.has(slot.uid)) return false;
    usedIds.add(slot.uid);
  }

  return true;
}

function validateGame(value: unknown): value is GameState {
  if (!isObject(value)) return false;

  if (value.phase !== "shop"
    && value.phase !== "searching"
    && value.phase !== "battle"
    && value.phase !== "finished") {
    return false;
  }

  if (!validateRun(value.run)) return false;
  if (typeof value.error !== "string" && value.error !== null) {
    return false;
  }

  if (value.phase === "battle") {
    const battle = value.battle;
    if (!isObject(battle)) return false;
    if (!isInteger(battle.frame) || battle.frame < 0) return false;
  } else if (value.battle !== null) {
    return false;
  }

  return true;
}

export function loadSavedGame(): GameState | null {
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (!isObject(parsed)) return null;
    if (parsed.version !== SAVE_VERSION) return null;
    if (!validateGame(parsed.game)) return null;

    const game = parsed.game;

    // Searches are not resumed. The player returns to the last safe shop state.
    if (game.phase === "searching") {
      return {
        ...game,
        phase: "shop",
        battle: null,
        error: null,
      };
    }

    if (game.phase === "battle" && isObject(game.battle)) {
      const result = game.battle.result;
      if (!isObject(result) || !Array.isArray(result.frames)) {
        return null;
      }

      if (game.battle.frame >= result.frames.length) {
        return null;
      }
    }

    return game;
  } catch {
    return null;
  }
}

export function saveGame(game: GameState): void {
  try {
    // Never save a live search as resumable.
    const safeGame: GameState =
      game.phase === "searching"
        ? { ...game, phase: "shop", battle: null, error: null }
        : game;

    const saved: SavedGame = {
      version: SAVE_VERSION,
      game: safeGame,
      savedAt: Date.now(),
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  } catch {
    // Storage can be unavailable or full; the game remains playable.
  }
}

export function clearSavedGame(): void {
  localStorage.removeItem(SAVE_KEY);
}