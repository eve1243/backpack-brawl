import { describe, expect, it } from "vitest";
import { buildPlayerFighter } from "../src/battle";
import {
  buyBlocker,
  buyItem,
  moveBlocker,
  moveItem,
  needsRunReset,
  newRun,
  rerollBlocker,
  rerollShop,
  sellItem,
} from "../src/run";

describe("B3 shop items", () => {
  it("offers at least three distinct poison items and three healing items that can be equipped", () => {
    const poisonItems = new Set<string>();
    const healItems = new Set<string>();

    for (let seed = 0; seed < 32; seed++) {
      const run = newRun(seed);
      run.shop.forEach((offer, index) => {
        if (buyBlocker(run, index)) return;
        const purchase = buyItem(run, index);
        const [equipped] = buildPlayerFighter(purchase.backpack).items;
        expect(equipped.itemId).toBe(offer);
        if (equipped.effects.poison) poisonItems.add(equipped.itemId);
        if (equipped.effects.heal) healItems.add(equipped.itemId);
      });
    }

    expect(poisonItems.size).toBeGreaterThanOrEqual(3);
    expect(healItems.size).toBeGreaterThanOrEqual(3);
  });
});

describe("B1 shop economy", () => {
  it("sells an item for half of its price rounded down", () => {
    const state = newRun(123);
    state.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };
    state.nextUid = 2;

    const result = sellItem(state, 0);

    expect(result.gold).toBe(12);
    expect(result.backpack[0]).toBeNull();
  });

  it("does not sell an empty backpack slot", () => {
    const state = newRun(123);

    const result = sellItem(state, 0);

    expect(result).toBe(state);
  });

  it("does not buy an item when the backpack is full", () => {
    const state = newRun(123);
    state.backpack = state.backpack.map(() => ({
      uid: "item-1",
      itemId: "chipped-dagger",
    }));

    const offerIndex = 0;
    expect(buyBlocker(state, offerIndex)).toBe("Backpack full");

    const result = buyItem(state, offerIndex);
    expect(result).toBe(state);
  });

  it("buys an item once into the first free slot", () => {
    const state = newRun(123);
    const offerIndex = 0;
    const itemId = state.shop[offerIndex];

    if (!itemId) throw new Error("The shop offer should exist");

    const result = buyItem(state, offerIndex);

    expect(result.backpack[0]?.itemId).toBe(itemId);
    expect(result.shop[offerIndex]).toBeNull();
    expect(result.nextUid).toBe(state.nextUid + 1);
  });

  it("rerolls the shop for exactly one gold", () => {
    const state = newRun(123);

    const result = rerollShop(state);

    expect(result.gold).toBe(state.gold - 1);
    expect(result.seed).not.toBe(state.seed);
  });

  it("does not reroll when the player has no gold", () => {
    const state = newRun(123);
    state.gold = 0;

    expect(rerollBlocker(state)).toBe("Not enough gold");

    const result = rerollShop(state);
    expect(result).toBe(state);
  });

  it("offers a run reset with no gold and no backpack item", () => {
    const state = newRun(123);
    state.gold = 0;

    expect(needsRunReset(state)).toBe(true);
  });

  it("does not offer a run reset when an item remains", () => {
    const state = newRun(123);
    state.gold = 0;
    state.backpack[0] = { uid: "item-1", itemId: "pot-lid" };

    expect(needsRunReset(state)).toBe(false);
  });
});

// ------ B2 Backpack arrangement tests ------
describe("B2 backpack arrangement", () => {
  it("moves an item into an empty backpack slot", () => {
    const state = newRun(123);
    state.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };

    const result = moveItem(state, 0, 3);

    expect(result.backpack[0]).toBeNull();
    expect(result.backpack[3]?.uid).toBe("item-1");
  });

  it("swaps two occupied backpack slots", () => {
    const state = newRun(123);
    state.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };
    state.backpack[2] = { uid: "item-2", itemId: "pot-lid" };

    const result = moveItem(state, 0, 2);

    expect(result.backpack[0]?.uid).toBe("item-2");
    expect(result.backpack[2]?.uid).toBe("item-1");
  });

  it("does not move an item from an empty source slot", () => {
    const state = newRun(123);

    expect(moveBlocker(state, 0, 2)).toBe("Source slot is empty");
    expect(moveItem(state, 0, 2)).toBe(state);
  });

  it("does not move to an invalid slot", () => {
    const state = newRun(123);
    state.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };

    expect(moveBlocker(state, 0, state.backpack.length)).toBe("Invalid slot");
    expect(moveItem(state, 0, state.backpack.length)).toBe(state);
  });

  it("does not change the backpack when moving to the same slot", () => {
    const state = newRun(123);
    state.backpack[0] = { uid: "item-1", itemId: "hunting-bow" };

    expect(moveItem(state, 0, 0)).toBe(state);
  });
});
