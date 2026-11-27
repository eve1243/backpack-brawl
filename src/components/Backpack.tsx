import { getItem } from "../items";
import { itemTooltip } from "../rules";
import { BACKPACK_COLS, itemIdsOf } from "../shop";
import { getActiveSets } from "../sets";
import { ActiveSetBonuses, SetBadge } from "./ItemSets";
import type { Backpack as BackpackSlots, RunState } from "../types";
import {moveBlocker, sellBlocker} from "../run";
import { useState } from "react";

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
      <div aria-live="polite">
        <ActiveSetBonuses sets={getActiveSets(itemIdsOf(backpack))} />
      </div>
      {selectedIndex !== null && (
        <button
          type="button"
          onClick={() => setSelectedIndex(null)}
          className="mb-3 rounded-md border border-gold px-3 py-1 text-sm"
        >
          Cancel selection
        </button>
      )}
      {selectedIndex !== null && (
        <p className="mb-3 text-sm text-muted">
          Grün markierte Slots: Dorthin kannst du das Item verschieben oder tauschen.
        </p>
      )}
      <ul className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${BACKPACK_COLS}, minmax(0, 1fr))` }}>
        {backpack.map((slot, index) => {
          const item = slot ? getItem(slot.itemId) : null;

          /// refund und blocker von sellBlocker abrufen, um zu sehen, ob das Item verkauft werden kann
          const refund = item ? Math.floor(item.price / 2) : 0;
          const blocker = sellBlocker(run, index);

          /// Zielslot des Verschiebens: alle anderen Slots sind erlaubt (leer = verschieben, belegt = tauschen)
          const target =
            selectedIndex !== null && selectedIndex !== index && moveBlocker(run, selectedIndex, index) === null;
          const targetLabel = target ? (slot ? "Tauschen" : "Hierher verschieben") : null;

          
          return (
            <li
              key={slot?.uid ?? `empty-${index}`}
              onClick={() => handleSlotClick(index)}
              title={item ? itemTooltip(item) : undefined}
              aria-label={item ? item.name : `Empty slot ${index + 1}`}
              className={[
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 p-1",
                target ? "ring-2 ring-life/70 bg-life/10" : "",
                item ? "cursor-pointer border-gold/40 bg-ink/40" : "cursor-pointer border-dashed border-panel-edge",
                selectedIndex === index
                  ? "border-gold ring-1 ring-gold/80 shadow-[0_0_22px_7px_rgba(227,176,75,0.38)]"
                  : "",
              ].join(" ")}
            >
              {targetLabel && <span className="text-center text-xs font-bold text-life">{targetLabel}</span>}
              {item && (
  <>
    <span className="text-3xl leading-none sm:text-4xl" aria-hidden>
      {item.icon}
    </span>
    <span className="text-center text-xs leading-tight">{item.name}</span>
    <SetBadge setId={item.setId} />

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
