import { describe, expect, it } from "vitest";
import { opponentForRound } from "../server/opponents.js";
import { buildFighter, buildOpponentFighter, buildPlayerFighter, simulateBattle } from "../src/battle";
import type { Fighter, FighterItem, ItemEffects } from "../src/types";

function item(name: string, cooldown: number, effects: ItemEffects): FighterItem {
  return { itemId: name, name, icon: "", cooldown, effects };
}

function fighter(name: string, items: FighterItem[], maxHp = 40): Fighter {
  return { name, items, maxHp };
}

describe("B4 Guard set", () => {
  it("starts the hero and opponent with four block for two or more Guard items", () => {
    const hero = buildPlayerFighter([
      { uid: "1", itemId: "oak-buckler" }, null, { uid: "2", itemId: "pot-lid" },
    ]);
    const enemy = buildOpponentFighter({
      ...opponentForRound(1), items: ["pot-lid", "pot-lid", "spiked-shield"],
    });
    const { frames } = simulateBattle(hero, enemy);

    expect(frames[0]).toMatchObject({ tick: 0, player: { block: 4 }, opponent: { block: 4 } });
  });

  it("spends the starting block on incoming damage and grants it only once", () => {
    const hero = buildFighter(["oak-buckler", "oak-buckler"], 40);
    const enemy = fighter("Enemy", [item("Blade", 1, { damage: 3 })]);
    const { frames } = simulateBattle(hero, enemy);

    expect(frames[1].player).toMatchObject({ hp: 40, block: 1 });
    expect(frames[2].player).toMatchObject({ hp: 38, block: 0 });
  });

  it("starts with zero block for a single Guard item or an active Fire set", () => {
    const hero = buildFighter(["pot-lid"], 40);
    const enemy = buildFighter(["ember-torch", "cinder-blade"], 40);
    const { frames } = simulateBattle(hero, enemy);

    expect(frames[0]).toMatchObject({ player: { block: 0 }, opponent: { block: 0 } });
  });
});

it("lets the round-two opponent poison the hero and recover lost HP with shop items", () => {
  const hero = buildFighter(["chipped-dagger"], 40, "Hero");
  const enemy = buildOpponentFighter(opponentForRound(2));
  const { events } = simulateBattle(hero, enemy);

  expect(events).toContainEqual(expect.objectContaining({
    kind: "poison", source: "opponent", target: "player", itemId: "bitter-root",
  }));
  expect(events).toContainEqual(expect.objectContaining({
    kind: "heal", source: "opponent", target: "opponent", itemId: "healing-herb", amount: 2,
  }));
});

it("lets the Pit Gladiator poison the hero and heal himself in round five", () => {
  const enemy = opponentForRound(5);
  expect(enemy.id).toBe("pit-gladiator");
  const hero = buildFighter(["hunting-bow"], 40);
  const { events } = simulateBattle(hero, buildOpponentFighter(enemy));

  expect(events).toContainEqual(expect.objectContaining({
    kind: "poison", source: "opponent", target: "player", itemId: "venom-vial", amount: 2,
  }));
  expect(events.some((event) => event.kind === "heal" && event.source === "opponent"
    && event.itemId === "field-tonic" && event.amount > 0)).toBe(true);
});

describe("B4 Fire set", () => {
  it("lets the round-six Ash Golem burn the hero with its equipped Fire items", () => {
    const opponent = opponentForRound(6);
    expect(opponent.id).toBe("ash-golem");
    const hero = buildFighter(["chipped-dagger"], 40, "Hero");
    const { frames, events } = simulateBattle(hero, buildOpponentFighter(opponent));

    const firstBurn = events.find((event) => event.kind === "burn");
    expect(firstBurn).toMatchObject({ tick: 4, itemId: "ember-torch", source: "opponent", target: "player", amount: 3 });
    expect(frames[4].events).toContainEqual(expect.objectContaining({
      kind: "burnDamage", source: "opponent", target: "player", amount: 6,
    }));
    expect(frames[4].player.statuses.burn).toBe(2);
    expect(events).toContainEqual(expect.objectContaining({
      kind: "burn", itemId: "forge-hammer", source: "opponent", target: "player", amount: 3,
    }));
  });

  it("gives three stacks per firing Fire item only to the side with an active set", () => {
    const hero = buildFighter(["ember-torch", "cinder-blade", "chipped-dagger"], 100);
    const enemy = buildFighter(["ember-torch"], 100);
    const { frames } = simulateBattle(hero, enemy);

    expect(frames[4].events.filter((event) => event.kind === "burn")).toMatchObject([
      { source: "player", target: "opponent", itemId: "ember-torch", amount: 3 },
    ]);
    expect(frames[4].opponent.statuses.burn).toBe(2);
    expect(frames[6].events.filter((event) => event.kind === "burn")).toMatchObject([
      { source: "player", target: "opponent", itemId: "cinder-blade", amount: 3 },
    ]);
    expect(frames[6].opponent.statuses.burn).toBe(4);
    expect(frames[6].player.statuses.burn).toBe(0);
  });

  it("hits block first on even ticks, loses one stack per hit and expires", () => {
    const hero = { ...fighter("Hero", []), startingBlock: 4 };
    const enemy = fighter("Enemy", [item("Slow flame", 9, { burn: 3 })]);
    const { frames } = simulateBattle(hero, enemy);

    expect(frames[9].player).toMatchObject({ hp: 40, block: 4, statuses: { burn: 3 } });
    expect(frames[10].player).toMatchObject({ hp: 38, block: 0, statuses: { burn: 2 } });
    expect(frames[11].player).toEqual(frames[10].player);
    expect(frames[12].player).toMatchObject({ hp: 34, statuses: { burn: 1 } });
    expect(frames[14].player).toMatchObject({ hp: 32, statuses: { burn: 0 } });
    expect(frames[16].events).toEqual([]);
  });

  it("resolves poison, then burn on both sides before deciding a knockout", () => {
    const flame = item("Flame", 2, { poison: 1, burn: 3 });
    const hero = { ...fighter("Hero", [flame], 1), startingBlock: 8 };
    const enemy = fighter("Enemy", [flame], 7);
    const result = simulateBattle(hero, enemy);
    const frame = result.frames[2];

    expect(frame.events.filter((event) => event.itemId === null)).toMatchObject([
      { kind: "poisonDamage", target: "player", amount: 1 },
      { kind: "poisonDamage", target: "opponent", amount: 1 },
      { kind: "burnDamage", target: "player", amount: 6 },
      { kind: "burnDamage", target: "opponent", amount: 6 },
    ]);
    expect(frame.player).toMatchObject({ hp: 0, block: 2, statuses: { burn: 2 } });
    expect(frame.opponent.hp).toBe(0);
    expect(result.winner).toBe("opponent");
    expect(simulateBattle(hero, enemy)).toEqual(result);
  });
});

describe("B3 poison", () => {
  it("keeps stacks between ticks and deals damage through block on even ticks", () => {
    const hero = fighter("Hero", [item("Venom", 3, { poison: 3 })]);
    const enemy = fighter("Enemy", [item("Shield", 3, { block: 8 })]);
    const { frames } = simulateBattle(hero, enemy);

    expect(frames[0].opponent.statuses.poison).toBe(0);
    expect(frames[2].events).toEqual([]);
    expect(frames[3].opponent).toMatchObject({ hp: 40, block: 8, statuses: { poison: 3 } });
    expect(frames[4].opponent).toMatchObject({ hp: 37, block: 8, statuses: { poison: 3 } });
    expect(frames[5].opponent).toEqual(frames[4].opponent);
    expect(frames[6].opponent).toMatchObject({ hp: 31, block: 16, statuses: { poison: 6 } });
  });

  it("combines stacks from multiple enemy items before one damage event against the hero", () => {
    const enemy = fighter("Enemy", [
      item("Fang", 2, { poison: 1 }),
      item("Venom", 2, { poison: 2 }),
    ]);
    const { frames } = simulateBattle(fighter("Hero", []), enemy);

    expect(frames[2].player.hp).toBe(37);
    expect(frames[2].opponent.statuses.poison).toBe(0);
    expect(frames[2].events).toMatchObject([
      { kind: "poison", source: "opponent", target: "player", itemId: "Fang", amount: 1 },
      { kind: "poison", source: "opponent", target: "player", itemId: "Venom", amount: 2 },
      { kind: "poisonDamage", source: "opponent", target: "player", itemId: null, amount: 3 },
    ]);
  });

  it("damages both poisoned fighters before deciding a simultaneous knockout", () => {
    const venom = item("Venom", 2, { poison: 1 });
    const hero = fighter("Hero", [venom], 1);
    const enemy = fighter("Enemy", [venom], 1);
    const result = simulateBattle(hero, enemy);

    expect(result.frames.at(-1)).toMatchObject({ tick: 2, player: { hp: 0 }, opponent: { hp: 0 } });
    expect(result.reason).toBe("knockout");
    expect(result.winner).toBe("opponent");
    expect(simulateBattle(hero, enemy)).toEqual(result);
  });
});

describe("B3 heal", () => {
  it.each([
    { damage: 10, restored: 5, finalHp: 35 },
    { damage: 2, restored: 2, finalHp: 40 },
  ])("restores $restored HP after the hero takes $damage damage", ({ damage, restored, finalHp }) => {
    const hero = fighter("Hero", [item("Herb", 3, { heal: 5 })]);
    const enemy = fighter("Enemy", [item("Blade", 2, { damage })]);
    const { frames } = simulateBattle(hero, enemy);

    expect(frames[2].player.hp).toBe(40 - damage);
    expect(frames[3].player.hp).toBe(finalHp);
    expect(frames[3].events).toMatchObject([
      { kind: "heal", source: "player", target: "player", itemId: "Herb", amount: restored },
    ]);
  });

  it("records a heal for zero HP when the owner is already at full health", () => {
    const hero = fighter("Hero", [item("Herb", 1, { heal: 5 })]);
    const { frames } = simulateBattle(hero, fighter("Enemy", []));

    expect(frames[1].player.hp).toBe(40);
    expect(frames[1].events).toMatchObject([
      { kind: "heal", amount: 0, message: "Herb restores 0 HP to Hero" },
    ]);
  });

  it("caps an opponent's healing at their own maximum HP", () => {
    const hero = fighter("Hero", [item("Blade", 2, { damage: 2 })]);
    const enemy = fighter("Enemy", [item("Herb", 3, { heal: 5 })], 25);
    const { frames } = simulateBattle(hero, enemy);

    expect(frames[2].opponent.hp).toBe(23);
    expect(frames[3].opponent.hp).toBe(25);
    expect(frames[3].events).toMatchObject([
      { kind: "heal", source: "opponent", target: "opponent", amount: 2 },
    ]);
  });
});
