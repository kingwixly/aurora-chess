"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuroraBand, PlayerName } from "@aurora/ui";
import api from "../../lib/api";

interface Entry {
  rank: number;
  rating: number;
  peak: number;
  solved?: number;
  user: {
    id: string;
    username: string;
    title?: string | null;
    fideVerified?: boolean;
    staffRank?: string | null;
    modShield?: boolean;
    activeFlair?: string | null;
  };
}

const POOLS = [
  { key: "BULLET", label: "Bullet" },
  { key: "BLITZ", label: "Blitz" },
  { key: "RAPID", label: "Rapid" },
  { key: "CLASSICAL", label: "Classical" },
  { key: "PUZZLES", label: "Puzzles" },
] as const;

/**
 * Leaderboards.
 *
 * Only settled ratings appear. Glicko-2 knows how confident each rating is, and
 * a 2400 with a wide deviation has played four games rather than demonstrated
 * anything - ranking on the raw number would put a lucky newcomer above a
 * proven player and make the board worthless within a week.
 */
export default function LeaderboardPage() {
  const [pool, setPool] = useState<string>("BLITZ");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [minGames, setMinGames] = useState(10);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const { data } =
        p === "PUZZLES"
          ? await api.get("/api/v1/leaderboard/puzzles")
          : await api.get(`/api/v1/leaderboard?pool=${p}`);
      setEntries(data.entries ?? []);
      setMinGames(data.minGames ?? 20);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(pool);
  }, [pool, load]);

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/play" className="text-sm text-night-400 transition-colors hover:text-white">
          &larr; Back to play
        </Link>

        <h1 className="mt-4 font-display text-3xl tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-sm text-night-400">
          Settled ratings only, {minGames} games minimum. A rating that has not found its level yet
          is not a ranking.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {POOLS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPool(p.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pool === p.key
                  ? "bg-aurora-cyan text-night-950"
                  : "bg-night-900 ring-1 ring-inset ring-night-700 hover:bg-night-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
          {loading ? (
            <p className="p-5 text-sm text-night-400">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="p-5 text-sm text-night-400">
              Nobody qualifies yet. Play {minGames} rated games here and you will be the first.
            </p>
          ) : (
            <ul className="divide-y divide-night-700">
              {entries.map((e) => (
                <li key={e.user.id} className="flex items-center gap-4 px-5 py-3">
                  <span
                    className={`w-7 shrink-0 text-right font-mono text-sm ${
                      e.rank <= 3 ? "font-bold text-aurora-cyan" : "text-night-400"
                    }`}
                  >
                    {e.rank}
                  </span>
                  <Link href={`/profile/${e.user.username}`} className="min-w-0 flex-1">
                    <PlayerName
                      username={e.user.username}
                      title={e.user.title as never}
                      fideVerified={e.user.fideVerified}
                      staffRank={e.user.staffRank}
                      modShield={e.user.modShield}
                      flair={e.user.activeFlair}
                    />
                  </Link>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-lg font-bold">{e.rating}</span>
                    {e.solved !== undefined ? (
                      <span className="block font-mono text-[11px] text-night-400">
                        {e.solved} solved
                      </span>
                    ) : (
                      e.peak > e.rating && (
                        <span className="block font-mono text-[11px] text-night-400">
                          peak {e.peak}
                        </span>
                      )
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
