import { getItem } from "./items";
import type { ItemSetId } from "./types";

interface ItemSet {
  id: ItemSetId;
  name: string;
  icon: string;
  requiredItems: number;
  startingBlock?: number;
}

export const ITEM_SETS: ItemSet[] = [
  { id: "fire", name: "Fire", icon: "🔥", requiredItems: 2 },
  { id: "guard", name: "Guard", icon: "🛡️", requiredItems: 2, startingBlock: 4 },
];

/** Each equipped copy counts, and each matching set is returned once. */
export function getActiveSets(itemIds: readonly string[]): ItemSet[] {
  const counts: Record<ItemSetId, number> = { fire: 0, guard: 0 };
  for (const itemId of itemIds) {
    const { setId } = getItem(itemId);
    if (setId) counts[setId] += 1;
  }
  return ITEM_SETS.filter((set) => counts[set.id] >= set.requiredItems);
}
