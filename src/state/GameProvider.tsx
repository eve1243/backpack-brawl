import { useState, type ReactNode, useEffect } from "react";
import { newGame } from "../game";
import type { GameState } from "../types";
import { GameContext, type GameContextValue } from "./GameContext";
import { loadSavedGame, saveGame } from "./save";

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

/** Holds the game state for all routes, so it survives navigating between pages. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState | null>(() => loadSavedGame());

  useEffect(() => {
    if(game) saveGame(game);
  }, [game]);

 const value: GameContextValue = {
    game,
    startNewRun: () =>
      setGame(newGame(randomSeed())),
    update: (transition) =>
      setGame((current) =>
        current ? transition(current) : current,
      ),
  };

  return <GameContext value={value}>{children}</GameContext>;
}
