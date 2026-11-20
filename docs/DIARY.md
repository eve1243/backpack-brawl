# Projekttagebuch

## Team

- **LJILJA Savic** (`ljiljasvc`)
- **Everlyn Njeri** (`eve1243`)

Wir arbeiten gemeinsam am Projekt **Backpack Brawl**. Wir verwenden
Feature-Branches, damit beide Personen gleichzeitig arbeiten können, ohne
direkt denselben Branch zu verändern.

## Aufgabenaufteilung

### LJILJA Savic (`ljiljasvc`)

#### B3 — Status effects (15%)

As a player, I want two new effects in battle:

- **Poison** adds stacks to the enemy. A poisoned fighter regularly loses HP for every stack. Poison stacks up and ignores block.
- **Heal** restores the fighter's own HP, but never above their max HP.

The catalog contains **at least 3 items per effect**, new or existing items changed, and the shop offers them. Opponents may use them. Poison and heal are shown in the battle view (for example a poison counter per fighter), in the combat log and in the rules panel and tooltips. Your team chooses the exact tick interval and values. They must be deterministic and explained in the interface.

#### B4 — Item sets (20%)

As a player, I want items to belong to sets that reward collecting them. There are **at least 2 sets**, one of them **Fire**. Each set has **at least 3 items**. Sets may reuse existing items. Each set grants a bonus while **2 or more** of its items are in a backpack. Bonuses apply to the player and to opponents alike. Set badges are shown on items in the shop and in battle, and active bonuses are visible.

The Fire set adds a new status, **Burn**, a damage-over-time effect that is clearly different from poison:

- it **stacks faster** and **deals more damage** than poison,
- it **does not ignore block**: block absorbs burn damage first,
- it **decays** over time until it wears off.

Your team chooses the exact tick, stack, damage and decay values. They must be deterministic and explained in the rules panel. Burn is shown in the battle view and the combat log.

#### B7 — Hall of fame (20%)

As a player, I want to enter my name at the end of a run and see how it compares with other runs. Finished runs are sent to the local API, which stores them and lists the best runs in an order your team defines and shows (for example: victories first, then more wins, then fewer rounds).

The API validates every submitted run and rejects invalid or implausible data with a clear error. The interface shows loading, empty and error states, lets me retry a failed submission without retyping, and never submits the same run twice. The hall of fame is reachable as its own page. The new endpoints are documented in `docs/API.md`.

### Everlyn Njeri (`eve1243`)

#### B1 — Shop economy (10%)

As a player, I want to sell items from my backpack for half their price (rounded down) and to reroll the shop offers for 1 🪙.

Gold never becomes negative, an item I pay for always ends up in my backpack, and an item is never lost or duplicated by buying or selling. Every action either completes fully or changes nothing. When an action is not possible, the interface tells me why before I try it, and the same rule also protects the action itself. Shop and backpack actions are only possible while I am shopping.

#### B2 — Backpack arrangement (15%)

As a player, I want to arrange my backpack. I can select an item, see that it is selected, and move it to another slot. Moving onto an occupied slot swaps the two items. The interface shows which moves are possible, and I can cancel a selection.

#### B6 — Save and resume (10%)

As a player, I want to refresh the browser and continue my run where I left it, on the matching screen. Your team decides which state is meaningful for continuing a run and stores it in the browser.

Saved data that is malformed, incompatible or describes an impossible run must not break the game; the game falls back to a playable state. Your team defines and communicates a policy for a refresh during a search or a battle replay. Refreshing must not become a way to get a free reroll, a different opponent, a second result, or to avoid a loss.

#### B5 — Resilient matchmaking (10%)

As a player, I want looking for an opponent to be reliable. While a search is running I see that it is running, and I cannot start a second one. A failed or unavailable API returns me to a usable shop with an understandable message and lets me try again.

A battle is only ever started for the current round and the current search. A slow, duplicate or late response must never restart a battle, start a battle outside a search, or apply a result twice.

## Ungefähre Arbeitsaufteilung

Die Requirements sind möglichst gleichmäßig aufgeteilt:

- **LJILJA Savic:** B3, B4 and B7 = 55%
- **Everlyn Njeri:** B1, B2, B5 and B6 = 45%


### Antworten auf die Architekturfragen

#### Wie werden Statuswerte in `FighterSnapshot` gespeichert?

- Möglichkeit 1: Poison, Heal und Burn direkt als einzelne Zahlen im Snapshot
- Möglichkeit 2: ein eigenes Objekt `statuses` mit `poison`, `burn` und eventuell `heal`
- Möglichkeit 3: Statuswerte nur in der Kampflogik speichern und nicht im Snapshot
- Unsere Lösung: eigenes `statuses`-Objekt im Snapshot
- Poison und Burn werden als Anzahl der Stacks gespeichert
- Heal wird nicht als dauerhafter Status gespeichert, sondern verändert direkt die HP
- so kann man die Werte auch in der Battle Ansicht anzeigen

#### Wie sehen Battle-Events für Poison, Heal und Burn aus?

- Möglichkeit 1: für jeden Effekt einen neuen Event-Typ machen
- Möglichkeit 2: ein allgemeines Event mit `kind` und `amount` benutzen
- Möglichkeit 3: die Effekte nur als Text in den Combat Log schreiben
- Unsere Lösung: allgemeine Battle-Events mit neuen Arten `poison`, `heal` und `burn`
- jedes Event hat Tick, source, target, amount, itemId und message
- dadurch kann die Anzeige die Events unterschiedlich einfärben
- nur Text wäre einfacher, aber schlechter zum testen und anzeigen

#### Wie werden Item-Sets modelliert?

- Möglichkeit 1: Set-Namen direkt bei jedem Item speichern
- Möglichkeit 2: eine extra Set-Tabelle mit Set-Namen, Item-IDs und Bonus machen
- Möglichkeit 3: Sets nur über einzelne if-Abfragen erkennen
- Unsere Lösung: jedes Item bekommt eine Set-ID oder mehrere Set-IDs
- die Set-Definition enthält Name, Icon, benötigte Anzahl und Bonus
- ein Set ist aktiv wenn mindestens zwei Items vom Set vorhanden sind
- die aktiven Sets werden für Spieler und Gegner gleich berechnet

#### Welche Daten werden für die Hall of Fame gespeichert?

- Möglichkeit 1: nur Name und Anzahl der Siege speichern
- Möglichkeit 2: Name, Ergebnis, Wins, Runden und Datum speichern
- Möglichkeit 3: die Daten in einer Datenbank speichern
- Unsere Lösung: Name, outcome, wins, rounds und ein Zeitstempel
- jeder Eintrag bekommt zusätzlich eine eindeutige ID
- der Server speichert die Einträge erstmal nur im Speicher
- eine Datenbank wäre für das kleine lokale Projekt zu aufwendig
- ungültige Namen oder unrealistische Werte werden von der API abgelehnt

#### Was passiert bei einem Refresh während Suche oder Replay?

- Möglichkeit 1: den genauen Zwischenstand speichern und danach weitermachen
- Möglichkeit 2: bei Refresh immer einen neuen Run starten
- Möglichkeit 3: den letzten sicheren Zustand vor der Suche oder dem Replay speichern
- Unsere Lösung: nur sichere Zustände werden in `localStorage` gespeichert
- während der Suche bleibt der Run im Shop-Zustand gespeichert
- bei einem Refresh während der Suche gibt es keinen neuen kostenlosen Reroll
- während dem Replay wird der bereits gestartete Kampf nicht nochmal gestartet
- nach dem Laden geht das Spiel auf den passenden sicheren Screen zurück
- so kann man nicht durch Refresh einen Kampf oder Verlust umgehen

## B1 weg

Hab zuerst den button eingefügt, um eine Item in einem Slot zu verkaufen. Hatte da aber den button ausversehen außerhalt vom Item, hieß das man leere Slots auch einen button bekommen haben, was zwar nicht geht, aber falsch aussieht und ist.

Gerade kann man auch weiter Items kaufen, auch wenn der rucksack schon voll ist, aber das 5 item wird im rucksack nicht angezeigt, und ist auch in der arena nicht dabei, aber das Gold verschwindet trotzdem nach dem "kauf".