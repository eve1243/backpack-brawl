import { CATALOG } from "../items";
import { runOutcome } from "../run";
import type { GameState, RunState } from "../types";

export const SAVE_KEY = "backpack-brawl-save";
const SAVE_VERSION = 2;

export interface SavedGameLoadResult {
  game: GameState | null;
  message: string | null;
}

interface SavedGame {
  version: number;
  game: GameState;
  savedAt: number;
}

// Small helper functions make the save validation easier to read.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function itemExists(itemId: unknown): itemId is string {
  if (typeof itemId !== "string") return false;
  return CATALOG.some((item) => item.id === itemId);
}

function validateRun(value: unknown): value is RunState {
  if (!isObject(value)) return false;

  if (!isWholeNumber(value.round) || value.round < 1) return false;
  if (!isWholeNumber(value.gold) || value.gold < 0) return false;
  if (!isWholeNumber(value.lives) || value.lives < 0 || value.lives > 3) return false;
  if (!isWholeNumber(value.wins) || value.wins < 0 || value.wins > 5) return false;
  if (!isWholeNumber(value.seed) || value.seed < 0) return false;
  if (!isWholeNumber(value.nextUid) || value.nextUid < 1) return false;

  // The shop must always contain exactly four offers.
  if (!Array.isArray(value.shop) || value.shop.length !== 4) return false;
  for (const itemId of value.shop) {
    if (itemId !== null && !itemExists(itemId)) return false;
  }

  // The backpack must always contain exactly six slots.
  if (!Array.isArray(value.backpack) || value.backpack.length !== 6) return false;

  const usedUids = new Set<string>();

  for (const slot of value.backpack) {
    if (slot === null) continue;
    if (!isObject(slot)) return false;

    if (typeof slot.uid !== "string" || slot.uid.length === 0) return false;
    if (typeof slot.itemId !== "string") return false;
    if (!itemExists(slot.itemId)) return false;
    if (usedUids.has(slot.uid)) return false;

    usedUids.add(slot.uid);
  }

  return true;
}

function validateBattle(battle: unknown, round: number, version: number): boolean {
  if (!isObject(battle)) return false;
  if (!isWholeNumber(battle.frame) || battle.frame < 0) return false;

  // The saved opponent must belong to the saved round.
  if (!isObject(battle.opponent)) return false;
  if (!isWholeNumber(battle.opponent.round)) return false;
  if (battle.opponent.round !== round) return false;
  if (typeof battle.opponent.id !== "string") return false;
  if (!isObject(battle.player) || !isObject(battle.enemy)) return false;

  // Replay frames must exist and the saved frame must point to one of them.
  if (!isObject(battle.result)) return false;
  if (!Array.isArray(battle.result.frames)) return false;
  if (battle.result.frames.length === 0) return false;
  if (battle.frame >= battle.result.frames.length) return false;

  if (battle.result.winner !== "player" && battle.result.winner !== "opponent") {
    return false;
  }
  if (battle.result.reason !== "knockout" && battle.result.reason !== "timeout") {
    return false;
  }

  for (const frame of battle.result.frames) {
    if (!isObject(frame)) return false;
    if (!validateSnapshot(frame.player, version)) return false;
    if (!validateSnapshot(frame.opponent, version)) return false;
  }

  return true;
}

function validateSnapshot(snapshot: unknown, version: number): boolean {
  if (!isObject(snapshot)) return false;
  if (!isWholeNumber(snapshot.hp) || snapshot.hp < 0) return false;
  if (!isWholeNumber(snapshot.maxHp) || snapshot.maxHp <= 0) return false;
  if (!isWholeNumber(snapshot.block) || snapshot.block < 0) return false;
  if (!isObject(snapshot.statuses)) return false;
  if (!isWholeNumber(snapshot.statuses.poison)) return false;
  if (snapshot.statuses.poison < 0) return false;
  // Version 1 recorded battles before Burn existed. Keep their original replay.
  if (version === 1 && snapshot.statuses.burn === undefined) snapshot.statuses.burn = 0;
  return isWholeNumber(snapshot.statuses.burn) && snapshot.statuses.burn >= 0;
}

function validateGame(value: unknown, version: number): value is GameState {
  if (!isObject(value)) return false;

  const phase = value.phase;
  if (
    phase !== "shop"
    && phase !== "searching"
    && phase !== "battle"
    && phase !== "finished"
  ) {
    return false;
  }

  if (!validateRun(value.run)) return false;
  if (typeof value.error !== "string" && value.error !== null) return false;

  if (phase === "battle") {
    if (!validateBattle(value.battle, value.run.round, version)) return false;
  }

  if (phase !== "battle" && value.battle !== null) return false;

  if (phase === "finished") {
    if (runOutcome(value.run) === null) return false;
  }

  return true;
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // The game can still be played if browser storage is unavailable.
  }
}

function discardSave(message: string): SavedGameLoadResult {
  clearSavedGame();
  return { game: null, message };
}

export function loadSavedGameResult(): SavedGameLoadResult {
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (!stored) return { game: null, message: null };

    const parsed: unknown = JSON.parse(stored);
    if (!isObject(parsed)) {
      return discardSave("The saved run was invalid and has been discarded.");
    }
    if (parsed.version !== 1 && parsed.version !== SAVE_VERSION) {
      return discardSave("The saved run is from an incompatible version and has been discarded.");
    }
    if (!validateGame(parsed.game, parsed.version)) {
      return discardSave("The saved run was invalid and has been discarded.");
    }

    const game = parsed.game;

    // A running search is never restored; it is safer to return to the shop.
    if (game.phase === "searching") {
      const safeGame: GameState = {
        ...game,
        phase: "shop",
        battle: null,
        error: null,
      };

      return {
        game: safeGame,
        message: "A running search was safely cancelled. The saved shop has been restored.",
      };
    }

    return { game, message: null };
  } catch {
    return discardSave("The saved run could not be read and has been discarded.");
  }
}

export function loadSavedGame(): GameState | null {
  return loadSavedGameResult().game;
}

export function saveGame(game: GameState): void {
  try {
    // Do not save the temporary "searching" phase.
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
    // The game remains playable if localStorage is unavailable or full.
  }
}
