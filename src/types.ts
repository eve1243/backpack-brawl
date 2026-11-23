export interface ItemEffects {
  damage?: number;
  block?: number;
  /** HP restored to the item owner when it fires, up to their max HP. */
  heal?: number;
  /** Stacks applied to the opposing fighter whenever this item fires. */
  poison?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  /** Cooldown in battle ticks (1 tick = 0.5 s). */
  cooldown: number;
  effects: ItemEffects;
}

/** A concrete item the player owns; several instances may share one `itemId`. */
export interface ItemInstance {
  uid: string;
  itemId: string;
}

/** Fixed-size grid, row by row; `null` marks a free slot. */
export type Backpack = (ItemInstance | null)[];

/** Shop offers by item id; `null` marks an offer that was already bought. */
export type ShopOffers = (string | null)[];

export type Phase = "shop" | "searching" | "battle" | "finished";

export interface RunState {
  round: number;
  gold: number;
  lives: number;
  wins: number;
  /** Seed for the next shop roll — keeps every shop deterministic. */
  seed: number;
  shop: ShopOffers;
  backpack: Backpack;
  /** Counter for generating unique `ItemInstance.uid`s. */
  nextUid: number;
}

export interface Opponent {
  id: string;
  name: string;
  icon: string;
  hp: number;
  round: number;
  items: string[];
}

export type Side = "player" | "opponent";

export interface FighterSnapshot {
  hp: number;
  maxHp: number;
  block: number;
  statuses: { poison: number };
}

export type BattleEventKind = "damage" | "block" | "poison" | "poisonDamage" | "heal";

export interface BattleEvent {
  tick: number;
  /** Who caused the event. */
  source: Side;
  /** Who is affected by it. */
  target: Side;
  kind: BattleEventKind;
  amount: number;
  /** Null for periodic damage from accumulated poison stacks. */
  itemId: string | null;
  message: string;
}

export interface BattleFrame {
  tick: number;
  player: FighterSnapshot;
  opponent: FighterSnapshot;
  /** Events that happened during this tick. */
  events: BattleEvent[];
}

export interface BattleResult {
  winner: Side;
  reason: "knockout" | "timeout";
  frames: BattleFrame[];
  events: BattleEvent[];
}

/** An item as it fights: the catalog values it brings into battle. */
export interface FighterItem {
  itemId: string;
  name: string;
  icon: string;
  cooldown: number;
  effects: ItemEffects;
}

/** Everything `simulateBattle` needs to know about one side. */
export interface Fighter {
  name: string;
  maxHp: number;
  items: FighterItem[];
}

/** A simulated battle being replayed frame by frame. */
export interface BattleReplay {
  opponent: Opponent;
  player: Fighter;
  enemy: Fighter;
  result: BattleResult;
  /** Index into `result.frames` that is currently shown. */
  frame: number;
}

/** Everything the UI needs: the run plus where in the round loop we are. */
export interface GameState {
  phase: Phase;
  run: RunState;
  /** Set while `phase === "battle"`. */
  battle: BattleReplay | null;
  /** Last opponent-search error, shown in the shop. */
  error: string | null;
}
