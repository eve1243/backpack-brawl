import { TICK_SECONDS } from "../battle";
import { describeEffects, getItem } from "../items";
import { BACKPACK_COLS } from "../shop";
import type { Backpack as BackpackSlots, ItemDef, RunState } from "../types";
import {sellBlocker} from "../run";
import { useState } from "react";
/// props: backpack slots to display



/** Hover text for a backpack slot: name, effects and cooldown. */
const tooltip = (item: ItemDef) =>
  [item.name, ...describeEffects(item.effects).map(({ label }) => label), `⏱️ every ${item.cooldown * TICK_SECONDS}s`].join("\n");

export function Backpack({
  backpack,
  run,
  onSell,
  onMove
}: {
  backpack: BackpackSlots;
  run: RunState;
  onSell: (slotIndex: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  function handleSlotClick(index: number) {
    if (selectedIndex === null) {
      if (backpack[index]) setSelectedIndex(index);
      return;
    }

    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }

    onMove(selectedIndex, index);
    setSelectedIndex(null);
  }

  return (
    <section className="rounded-lg border border-panel-edge bg-panel p-4">
      <h2 className="font-display text-xl font-bold">🎒 Backpack</h2>
      <p className="mb-3 text-sm text-muted">Hover an item to see its stats.</p>
      {selectedIndex !== null && (
        <button
          type="button"
          onClick={() => setSelectedIndex(null)}
          className="mb-3 rounded-md border border-gold px-3 py-1 text-sm"
        >
          Cancel selection
        </button>
      )}
      <ul className="grid gap-2" style={{ gridTemplateColumns: `repeat(${BACKPACK_COLS}, minmax(0, 1fr))` }}>
        {backpack.map((slot, index) => {
          const item = slot ? getItem(slot.itemId) : null;

          /// refund und blocker von sellBlocker abrufen, um zu sehen, ob das Item verkauft werden kann
          const refund = item ? Math.floor(item.price / 2) : 0;
          const blocker = sellBlocker(run, index);

          
          return (
            <li
              key={slot?.uid ?? `empty-${index}`}
              onClick={() => handleSlotClick(index)}
              title={item ? tooltip(item) : undefined}
              aria-label={item ? item.name : `Empty slot ${index + 1}`}
              className={[
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 p-1",
                item ? "cursor-pointer border-gold/40 bg-ink/40" : "cursor-pointer border-dashed border-panel-edge",
                selectedIndex === index
                  ? "border-gold ring-1 ring-gold/80 shadow-[0_0_22px_7px_rgba(227,176,75,0.38)]"
                  : "",
              ].join(" ")}
            >
              {item && (
  <>
    <span className="text-3xl leading-none sm:text-4xl" aria-hidden>
      {item.icon}
    </span>
    <span className="text-center text-xs leading-tight">{item.name}</span>

    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSell(index);
      }}
      disabled={blocker !== null}
      title={blocker ?? `Sell for ${refund} 🪙`}
      className="rounded-md bg-gold px-2 py-1 text-xs font-bold text-ink hover:brightness-110 disabled:bg-panel-edge disabled:text-muted"
    >
      Sell {refund} 🪙
    </button>
  </>
)}

             
            </li>
          );
        })}
      </ul>
    </section>
  );
}
