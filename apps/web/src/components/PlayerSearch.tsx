"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PlayerName } from "@aurora/ui";
import api from "../lib/api";

interface Found {
  id: string;
  username: string;
  rating: number;
  title?: string | null;
  fideVerified?: boolean;
  staffRank?: string | null;
  modShield?: boolean;
  activeFlair?: string | null;
  /** Set when the match came from a name they no longer use. */
  formerlyKnownAs?: string | null;
}

/**
 * Search for players by name.
 *
 * Debounced, because a request per keystroke is both wasteful and rate-limited.
 * Results link straight to profiles rather than offering actions inline —
 * deciding whether to friend or challenge someone is a decision you make after
 * looking at them, not from a dropdown.
 */
export default function PlayerSearch({ placeholder = "Search players" }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/v1/users/search?q=${encodeURIComponent(term)}`);
        setResults(data.users ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-night-700 bg-night-800 px-3.5 py-2.5 text-white placeholder:text-night-500 focus:border-aurora-cyan focus:outline-none"
      />

      {q.trim().length >= 2 && (
        <div className="mt-2 overflow-hidden rounded-lg bg-night-900 ring-1 ring-inset ring-night-700">
          {loading ? (
            <p className="px-4 py-3 text-sm text-night-500">Searching...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-night-500">No players found.</p>
          ) : (
            <ul className="divide-y divide-night-700">
              {results.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/profile/${u.username}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-night-800"
                  >
                    <PlayerName
                      username={u.username}
                      title={u.title as never}
                      fideVerified={u.fideVerified}
                      staffRank={u.staffRank}
                      modShield={u.modShield}
                      flair={u.activeFlair}
                      size="sm"
                    />
                    <span className="flex shrink-0 items-center gap-2">
                      {u.formerlyKnownAs && (
                        <span className="text-xs text-night-500" title="Previously known as">
                          was {u.formerlyKnownAs}
                        </span>
                      )}
                      <span className="font-mono text-sm text-night-400">{u.rating}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
