"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocalHistory, type LocalGame } from "../../../stores/localHistory";

/**
 * Games played on this device.
 *
 * Not on your profile and not on the server - these had no accounts behind
 * them, so there is nowhere else they could go and no rating they could
 * affect. Visible only to whoever holds the phone, which is the right audience
 * for a game two people played in a room.
 */
export default function LocalHistoryPage() {
  const { games, load, remove, clear } = useLocalHistory();
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const copyPgn = async (game: LocalGame) => {
    try {
      await navigator.clipboard.writeText(game.pgn);
      setCopied(game.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked. The PGN is shown below regardless, so it can still
      // be selected by hand.
      setOpen(game.id);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-md bg-night-950 px-6 py-10">
      <Link href="/play" className="text-sm text-night-400 hover:text-white">
        &larr; Back
      </Link>
      <h1 className="mt-4 font-display text-3xl tracking-tight">In-person games</h1>
      <p className="mt-1 text-sm text-night-400">
        Stored on this device only. Nothing here affects your rating or appears on your profile.
      </p>

      {games.length === 0 ? (
        <div className="mt-8 rounded-xl bg-night-900 p-6 text-center ring-1 ring-inset ring-night-700">
          <p className="text-sm text-night-300">No games recorded yet.</p>
          <Link
            href="/play/clock"
            className="mt-3 inline-block rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950"
          >
            Start a game
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-2">
            {games.map((g) => (
              <li
                key={g.id}
                className="overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700"
              >
                <button
                  onClick={() => setOpen(open === g.id ? null : g.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {g.white} vs {g.black}
                    </span>
                    <span className="shrink-0 font-mono text-sm text-night-300">{g.result}</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2">
                    <span className="text-xs text-night-400">
                      {g.termination} &middot; {g.timeControl}
                      {g.moveCount > 0 && ` \u00B7 ${Math.ceil(g.moveCount / 2)} moves`}
                    </span>
                    <span className="shrink-0 text-xs text-night-400">
                      {new Date(g.playedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>

                {open === g.id && (
                  <div className="border-t border-night-700 p-3">
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-night-950 p-2 font-mono text-[11px] text-night-300">
                      {g.pgn}
                    </pre>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => copyPgn(g)}
                        className="rounded-lg bg-night-800 px-3 py-1.5 text-xs text-night-200"
                      >
                        {copied === g.id ? "Copied" : "Copy PGN"}
                      </button>
                      {g.moveCount > 0 && (
                        <Link
                          href={`/analysis?pgn=${encodeURIComponent(g.pgn)}`}
                          className="rounded-lg bg-aurora-cyan px-3 py-1.5 text-xs font-semibold text-night-950"
                        >
                          Analyse
                        </Link>
                      )}
                      <button
                        onClick={() => remove(g.id)}
                        className="rounded-lg px-3 py-1.5 text-xs text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <button
            onClick={() => {
              if (confirm("Delete every game recorded on this device?")) clear();
            }}
            className="mt-6 block w-full rounded-lg py-2 text-center text-xs text-night-400 hover:text-red-300"
          >
            Clear history
          </button>
        </>
      )}
    </main>
  );
}
