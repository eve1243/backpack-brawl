import { getItem } from "./items";
import { getActiveSets } from "./sets";
import { itemIdsOf } from "./shop";
import type { Backpack, BattleEvent, BattleResult, Fighter, FighterItem, FighterSnapshot, Opponent, Side } from "./types";

/** Seconds per battle tick. */
export const TICK_SECONDS = 0.5;
export const POISON_INTERVAL_TICKS = 2;
export const BURN_INTERVAL_TICKS = 2;
export const BURN_DAMAGE_PER_STACK = 2;
export const BURN_DECAY_PER_TICK = 1;
/** Battles that last longer are decided by the timeout rule. */
export const MAX_TICKS = 60;
export const HERO_BASE_HP = 40;

/** Turns a list of item ids into a fighter with the catalog values of each item. */
export function buildFighter(itemIds: string[], baseHp: number, name = "Fighter"): Fighter {
  const activeSets = getActiveSets(itemIds);
  const items: FighterItem[] = itemIds.map((id) => {
    const def = getItem(id);
    const effects = { ...def.effects };
    const set = activeSets.find((set) => set.id === def.setId);
    if (set?.burnOnActivation) effects.burn = set.burnOnActivation;
    return { itemId: def.id, name: def.name, icon: def.icon, cooldown: def.cooldown, effects };
  });
  const startingBlock = activeSets.reduce((total, set) => total + (set.startingBlock ?? 0), 0);
  return { name, maxHp: baseHp, startingBlock, items };
}

/** The player's fighter: every backpack item and the hero's base HP. */
export function buildPlayerFighter(backpack: Backpack): Fighter {
  return buildFighter(itemIdsOf(backpack), HERO_BASE_HP, "Hero");
}

export function buildOpponentFighter(opponent: Opponent): Fighter {
  return buildFighter(opponent.items, opponent.hp, opponent.name);
}

interface FighterState {
  fighter: Fighter;
  hp: number;
  block: number;
  poison: number;
  burn: number;
  /** Ticks each item has charged towards its cooldown. */
  charge: number[];
}

const other = (side: Side): Side => (side === "player" ? "opponent" : "player");

const snapshot = (s: FighterState): FighterSnapshot => ({
  hp: Math.max(0, s.hp),
  maxHp: s.fighter.maxHp,
  block: s.block,
  statuses: { poison: s.poison, burn: s.burn },
});

const isDown = (s: FighterState) => s.hp <= 0;

/**
 * Runs a full battle. Pure and deterministic: the same fighters always give
 * the same result.
 *
 * Each tick:
 * 1. Each fighter charges all items by one tick; items whose charge reaches their cooldown fire.
 * 2. Fired items resolve (player first, then opponent). Both sides fire "simultaneously":
 *    which items fire is decided before any effect is applied.
 * 3. On every second tick, both sides take poison damage for all their stacks, including new ones.
 * 4. On each burn tick, block absorbs burn damage first, then the stacks decay on both sides.
 * After all effects the battle ends if someone is down; if both are down, the player loses.
 * After `MAX_TICKS` the higher HP percentage wins; a tie is a player loss.
 */
export function simulateBattle(player: Fighter, opponent: Fighter): BattleResult {
  const state: Record<Side, FighterState> = {
    player: initState(player),
    opponent: initState(opponent),
  };
  const frames: BattleResult["frames"] = [
    { tick: 0, player: snapshot(state.player), opponent: snapshot(state.opponent), events: [] },
  ];
  const events: BattleEvent[] = [];

  const knockoutWinner = (): Side | null => {
    if (isDown(state.player)) return "opponent";
    if (isDown(state.opponent)) return "player";
    return null;
  };

  let winner: Side | null = null;
  let tick = 0;
  while (winner === null && tick < MAX_TICKS) {
    tick += 1;
    const tickEvents: BattleEvent[] = [];
    const emit = (event: Omit<BattleEvent, "tick">) => tickEvents.push({ tick, ...event });

    const fired: Record<Side, FighterItem[]> = {
      player: chargeItems(state.player),
      opponent: chargeItems(state.opponent),
    };
    for (const side of ["player", "opponent"] as const) {
      for (const item of fired[side]) resolveItem(item, state[side], state[other(side)], side, emit);
    }
    if (tick % POISON_INTERVAL_TICKS === 0) {
      for (const target of ["player", "opponent"] as const) {
        const victim = state[target];
        if (victim.poison === 0) continue;
        victim.hp -= victim.poison;
        emit({
          source: other(target), target, kind: "poisonDamage", amount: victim.poison, itemId: null,
          message: `Poison deals ${victim.poison} damage to ${victim.fighter.name}, ignoring block`,
        });
      }
    }
    if (tick % BURN_INTERVAL_TICKS === 0) {
      for (const target of ["player", "opponent"] as const) {
        const victim = state[target];
        if (victim.burn === 0) continue;
        const damage = victim.burn * BURN_DAMAGE_PER_STACK;
        const absorbed = applyBlockableDamage(victim, damage);
        victim.burn = Math.max(0, victim.burn - BURN_DECAY_PER_TICK);
        emit({
          source: other(target), target, kind: "burnDamage", amount: damage, itemId: null,
          message: `Burn deals ${damage} damage to ${victim.fighter.name} (${absorbed} blocked, ${victim.burn} stacks left)`,
        });
      }
    }
    winner = knockoutWinner();

    frames.push({ tick, player: snapshot(state.player), opponent: snapshot(state.opponent), events: tickEvents });
    events.push(...tickEvents);
  }

  if (winner !== null) return { winner, reason: "knockout", frames, events };
  return { winner: timeoutWinner(state.player, state.opponent), reason: "timeout", frames, events };
}

function initState(fighter: Fighter): FighterState {
  return { fighter, hp: fighter.maxHp, block: fighter.startingBlock ?? 0, poison: 0, burn: 0, charge: fighter.items.map(() => 0) };
}

/** Applies damage and returns the amount absorbed by block. */
function applyBlockableDamage(target: FighterState, damage: number): number {
  const absorbed = Math.min(target.block, damage);
  target.block -= absorbed;
  target.hp -= damage - absorbed;
  return absorbed;
}

/** Advances one tick of cooldowns and returns the items that fire this tick. */
function chargeItems(s: FighterState): FighterItem[] {
  const fired: FighterItem[] = [];
  s.fighter.items.forEach((item, i) => {
    s.charge[i] += 1;
    if (s.charge[i] >= item.cooldown) {
      s.charge[i] = 0;
      fired.push(item);
    }
  });
  return fired;
}

function resolveItem(
  item: FighterItem,
  self: FighterState,
  enemy: FighterState,
  side: Side,
  emit: (event: Omit<BattleEvent, "tick">) => void,
) {
  const { damage, block, poison, burn, heal } = item.effects;
  const base = { source: side, itemId: item.itemId };
  const enemySide = other(side);

  if (damage) {
    const absorbed = applyBlockableDamage(enemy, damage);
    const note = absorbed > 0 ? ` (${absorbed} blocked)` : "";
    emit({ ...base, target: enemySide, kind: "damage", amount: damage, message: `${item.name} hits ${enemy.fighter.name} for ${damage}${note}` });
  }
  if (block) {
    self.block += block;
    emit({ ...base, target: side, kind: "block", amount: block, message: `${item.name} grants ${self.fighter.name} ${block} block` });
  }
  if (poison) {
    enemy.poison += poison;
    emit({
      ...base, target: enemySide, kind: "poison", amount: poison,
      message: `${item.name} adds poison to ${enemy.fighter.name} (+${poison}, total stacks: ${enemy.poison})`,
    });
  }
  if (burn) {
    enemy.burn += burn;
    emit({
      ...base, target: enemySide, kind: "burn", amount: burn,
      message: `${item.name} adds burn to ${enemy.fighter.name} (+${burn}, total stacks: ${enemy.burn})`,
    });
  }
  if (heal) {
    const restored = Math.min(heal, self.fighter.maxHp - self.hp);
    self.hp += restored;
    emit({
      ...base, target: side, kind: "heal", amount: restored,
      message: `${item.name} restores ${restored} HP to ${self.fighter.name}`,
    });
  }
}

function timeoutWinner(player: FighterState, opponent: FighterState): Side {
  const ratio = (s: FighterState) => s.hp / s.fighter.maxHp;
  return ratio(player) > ratio(opponent) ? "player" : "opponent";
}
