import { BURN_DAMAGE_PER_STACK, BURN_DECAY_PER_TICK, BURN_INTERVAL_TICKS, HERO_BASE_HP, MAX_TICKS, POISON_INTERVAL_TICKS, TICK_SECONDS } from "./battle";
import { GOLD_PER_ROUND, START_GOLD, START_LIVES, WINS_TO_VICTORY } from "./run";
import { BACKPACK_COLS, BACKPACK_ROWS, SHOP_SIZE } from "./shop";
import { describeEffects } from "./items";
import type { ItemDef, ItemEffects } from "./types";

/**
 * Player-facing explanations of the rules. Built from the game constants so
 * the texts stay correct when numbers are rebalanced.
 */

const BATTLE_SECONDS = MAX_TICKS * TICK_SECONDS;

/** Tooltip per item effect. */
export const EFFECT_HELP: Record<keyof ItemEffects, string> = {
  burn: `Every ${BURN_INTERVAL_TICKS * TICK_SECONDS}s, each Burn stack deals ${BURN_DAMAGE_PER_STACK} damage. Block absorbs damage first, then Burn loses ${BURN_DECAY_PER_TICK} stack.`,
  damage: "Damage: hits the enemy. Block absorbs it first, the rest is lost from HP.",
  block: "Block: absorbs incoming damage until used up. Unused block stays for the rest of the battle.",
  heal: "Heal immediately restores the item owner's HP up to their maximum. At full HP it restores 0.",
  poison: `Poison stacks on the opposing fighter until the battle ends. Every ${POISON_INTERVAL_TICKS * TICK_SECONDS}s of battle time, each stack deals 1 damage directly to HP, ignoring block.`,
};

export function itemTooltip(item: Pick<ItemDef, "name" | "cooldown" | "effects">): string {
  const effects = describeEffects(item.effects).map(({ effect, label }) => `${label} — ${EFFECT_HELP[effect]}`);
  return [item.name, ...effects, `Activates every ${item.cooldown * TICK_SECONDS}s.`].join("\n");
}

export const COOLDOWN_HELP = `Cooldown: the item fires every time this much battle time has passed (1 tick = ${TICK_SECONDS} s).`;

/** Tooltip per fighter status shown in battle. */
export const STATUS_HELP = {
  hp: "HP: reaching 0 is a knockout.",
  block: EFFECT_HELP.block,
  timer: `After ${BATTLE_SECONDS} s the fighter with the higher share of HP wins; a tie counts as your loss.`,
};

export interface RuleSection {
  title: string;
  rules: string[];
}

export const RULES: RuleSection[] = [
  {
    title: "🏆 The run",
    rules: [
      `Reach ${WINS_TO_VICTORY} wins before you lose all ${START_LIVES} lives.`,
      `Each battle is one round: a win gives +1 win, a loss costs 1 life.`,
      `Opponents get tougher every round.`,
    ],
  },
  {
    title: "🏪 Shop & backpack",
    rules: [
      `You start with ${START_GOLD} 🪙 and earn ${GOLD_PER_ROUND} 🪙 at the start of every new round. Unspent gold carries over.`,
      `The shop offers ${SHOP_SIZE} new items every round.`,
      `Bought items go to the first free slot of your ${BACKPACK_COLS}×${BACKPACK_ROWS} backpack and stay there for the whole run.`,
      `Only items in your backpack fight. Their position doesn't matter.`,
    ],
  },
  {
    title: "⚔️ Battle",
    rules: [
      `Battles run on their own. Your hero has ${HERO_BASE_HP} HP; every item fires whenever its cooldown is up.`,
      `Direct item damage hits block first. Only the rest is lost from HP. Unused block stays for the rest of the battle.`,
      `Knock the enemy out to win. ${STATUS_HELP.timer} If both fall at once, you lose.`,
    ],
  },
  {
    title: "☠️ Poison & healing",
    rules: [
      EFFECT_HELP.poison,
      "Items activate first. Newly added stacks count on the same poison tick. Both fighters take poison damage before knockouts are decided.",
      EFFECT_HELP.heal,
    ],
  },
];
