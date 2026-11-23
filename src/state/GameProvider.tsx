import { useState, type ReactNode, useEffect } from "react";
import { newGame } from "../game";
import type { GameState } from "../types";
import { GameContext, type GameContextValue } from "./GameContext";
import { loadSavedGameResult, saveGame } from "./save";

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

/** Holds the game state for all routes, so it survives navigating between pages. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState(() => loadSavedGameResult());
  const [game, setGame] = useState<GameState | null>(initialLoad.game);
  const [saveMessage, setSaveMessage] = useState<string | null>(initialLoad.message);

  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);

  useEffect(() => {
    function saveBeforeLeaving() {
      if (game) saveGame(game);
    }

    window.addEventListener("beforeunload", saveBeforeLeaving);
    window.addEventListener("pagehide", saveBeforeLeaving);

    return () => {
      window.removeEventListener("beforeunload", saveBeforeLeaving);
      window.removeEventListener("pagehide", saveBeforeLeaving);
    };
  }, [game]);

  const value: GameContextValue = {
    game,
    saveMessage,
    clearSaveMessage: () => setSaveMessage(null),
    startNewRun: () =>
      setGame(newGame(randomSeed())),
    update: (transition) =>
      setGame((current) =>
        current ? transition(current) : current,
      ),
  };

  return <GameContext value={value}>{children}</GameContext>;
}
