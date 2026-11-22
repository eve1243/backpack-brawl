import { getItem } from "./items";
import { BACKPACK_SIZE, rollShop } from "./shop";
import type { RunState, Side } from "./types";

export const START_GOLD = 10;
export const START_LIVES = 3;
export const WINS_TO_VICTORY = 5;
export const GOLD_PER_ROUND = 5;
export const REROLL_COST = 1;

export function newRun(seed: number): RunState {
  const roll = rollShop(seed);
  return {
    round: 1,
    gold: START_GOLD,
    lives: START_LIVES,
    wins: 0,
    seed: roll.seed,
    shop: roll.offers,
    backpack: Array(BACKPACK_SIZE).fill(null),
    nextUid: 1,
  };
}

export function firstFreeSlot(state: RunState): number {
  return state.backpack.indexOf(null);
}

/** Why an item can't be moved to another backpack slot */
export function moveBlocker(
  state: RunState,
  fromIndex: number,
  toIndex: number,
): string | null {
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= state.backpack.length ||
    toIndex >= state.backpack.length
  ) {
    return "Invalid slot";
  }

  if (!state.backpack[fromIndex]) {
    return "Source slot is empty";
  }

  return null;
}

/**
 * Moves an item to a free slot or swaps it with the item in an occupied slot.
 * Returns the unchanged state when the move is not allowed.
 */
export function moveItem(
  state: RunState,
  fromIndex: number,
  toIndex: number,
): RunState {
  if (moveBlocker(state, fromIndex, toIndex) !== null) return state;

  if (fromIndex === toIndex) return state;

  const backpack = [...state.backpack];
  const sourceItem = backpack[fromIndex];
  const targetItem = backpack[toIndex];

  backpack[fromIndex] = targetItem;
  backpack[toIndex] = sourceItem;

  return { ...state, backpack };
}

/** Why an offer can't be bought right now. */
export function buyBlocker(state: RunState, offerIndex: number): string | null {
  const itemId = state.shop[offerIndex];

  /// check if the offer is valid
  if (!itemId) return "Already sold";
  /// check if the player has enough gold to buy the item
  if (state.gold < getItem(itemId).price) return "Not enough gold";
  /// check if there is a free slot in the backpack
  if (firstFreeSlot(state) === -1) return "Backpack full";

  return null;
}

/** Buys a shop offer into the first free backpack slot; unchanged state if not allowed. */
export function buyItem(state: RunState, offerIndex: number): RunState {
  if (buyBlocker(state, offerIndex) !== null) return state;

  const slot = firstFreeSlot(state);
  ///wenn kein freier slot vorhanden ist, return state
  if (slot === -1) return state;

  const itemId = state.shop[offerIndex]!;
  const backpack = [...state.backpack];
  backpack[slot] = { uid: `item-${state.nextUid}`, itemId };
  const shop = [...state.shop];
  shop[offerIndex] = null;
  return { ...state, gold: state.gold - getItem(itemId).price, shop, backpack, nextUid: state.nextUid + 1 };
}
///Prüft ob der shop gerollt werden kann, wenn nicht gibt es den Grund zurück, ansonsten null
export function rerollBlocker(state: RunState): string | null {
  if (state.gold < REROLL_COST) {
    return "Not enough gold";
  }

  return null;
}

///Erstellt neue Angebote im Shop, wenn möglich und zieht ein Gold ab
export function rerollShop(state: RunState): RunState {
  if (rerollBlocker(state) !== null) return state;

  const roll = rollShop(state.seed);

  return {
    ...state,
    gold: state.gold - REROLL_COST,
    seed: roll.seed,
    shop: roll.offers,
  };
}

export function needsRunReset(state: RunState): boolean {
  const backpackEmpty = state.backpack.every((slot) => slot === null);
  return state.gold === 0 && backpackEmpty;
}

/// Warum ein Item im Rucksack nicht verkauft werden kann, oder `null`, wenn es verkauft werden kann.
export function sellBlocker(state: RunState, slotIndex: number): string | null {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= state.backpack.length) {
    return "Invalid slot";
  }

  if (!state.backpack[slotIndex]) {
    return "Empty slot";
  }

  return null;
}

/** Verkaufe das Item im Rucksack für den halben Preis.
  */
export function sellItem(state: RunState, slotIndex: number): RunState {
  if (sellBlocker(state, slotIndex) !== null) return state;

  const backpack = [...state.backpack];
  const soldItem = backpack[slotIndex];

  if (!soldItem) return state;

  const item = getItem(soldItem.itemId);
  const refund = Math.floor(item.price / 2);

  backpack[slotIndex] = null;

  return {
    ...state,
    gold: state.gold + refund,
    backpack,
  };
}




export type RunOutcome = "victory" | "defeat";

/** `victory` / `defeat` once the run is over, otherwise `null`. */
export function runOutcome(state: RunState): RunOutcome | null {
  if (state.wins >= WINS_TO_VICTORY) return "victory";
  if (state.lives <= 0) return "defeat";
  return null;
}

/** Starts the next round: round + 1, round gold, fresh shop. The backpack is kept. */
export function startNextRound(state: RunState): RunState {
  const roll = rollShop(state.seed);
  return { ...state, round: state.round + 1, gold: state.gold + GOLD_PER_ROUND, seed: roll.seed, shop: roll.offers };
}

/** Records a battle (win → +1 win, loss → −1 life) and moves on to the next round unless the run is over. */
export function applyBattleResult(state: RunState, winner: Side): RunState {
  const scored = winner === "player" ? { ...state, wins: state.wins + 1 } : { ...state, lives: state.lives - 1 };
  return runOutcome(scored) ? scored : startNextRound(scored);
}
