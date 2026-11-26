import { Link, NavLink, Outlet } from "react-router";
import { ROUTES } from "../game";
import { useGame } from "../state/GameContext";

export function Layout() {
  const { saveMessage, clearSaveMessage } = useGame();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-panel-edge py-4">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          <Link to={ROUTES.start}>
            🎒 Backpack <span className="text-gold">Brawl</span>
          </Link>
        </h1>
        <nav aria-label="Main navigation">
          <NavLink to={ROUTES.hallOfFame} className="font-bold text-gold hover:underline aria-[current=page]:underline">
            Hall of Fame
          </NavLink>
        </nav>
      </header>

      <main className="flex flex-1 flex-col gap-4 py-6">
        {saveMessage && (
          <section
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg border border-gold bg-panel px-4 py-3"
          >
            <p>{saveMessage}</p>
            <button
              type="button"
              onClick={clearSaveMessage}
              className="rounded-md border border-panel-edge px-3 py-1 text-sm hover:bg-panel-edge/40"
            >
              Close
            </button>
          </section>
        )}
        <Outlet />
      </main>

      <footer className="border-t border-panel-edge py-3 text-xs tracking-wider text-muted">
        Backpack Brawl · practical exam starter
      </footer>
    </div>
  );
}
