import { setBonusText, setRule } from "../rules";
import { ITEM_SETS, type ItemSet } from "../sets";
import type { ItemSetId } from "../types";

export function SetBadge({ setId }: { setId?: ItemSetId }) {
  const set = ITEM_SETS.find((entry) => entry.id === setId);
  if (!set) return null;
  const colour = set.id === "fire" ? "border-orange-400/50 text-orange-200" : "border-sky-400/50 text-sky-200";
  return (
    <span title={setRule(set)} className={`inline-flex items-center gap-1 rounded border px-1.5 text-xs font-medium ${colour}`}>
      <span aria-hidden>{set.icon}</span>{set.name}
    </span>
  );
}

export function ActiveSetBonuses({ sets }: { sets: ItemSet[] }) {
  if (!sets.length) return null;
  return (
    <ul aria-label="Active set bonuses" className="space-y-1 text-sm">
      {sets.map((set) => (
        <li key={set.id}>
          <strong className="text-gold">{set.name} active</strong> · {setBonusText(set)}
        </li>
      ))}
    </ul>
  );
}
