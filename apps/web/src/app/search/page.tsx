"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "../../lib/api";
import { PlayerName, AuroraBand } from "@aurora/ui";
import type { Title } from "@aurora/chess";
import { useAuthStore } from "../../stores/auth";

interface SearchUser {
  id: string;
  username: string;
  rating: number;
  titleManual?: Title | null;
  titleAuto?: Title | null;
  countryCode?: string | null;
  staffRank?: string | null;
  /** Set when the account previously went by the searched name. */
  matchedFormerName?: string | null;
}

/**
 * Search, on its own page.
 *
 * Deliberately not part of the friends page. Filtering people you already know
 * and searching everyone on the site are different jobs, and putting both
 * behind identical-looking inputs on one screen made them feel like a single
 * broken control.
 */
export default function SearchPage() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [touched, setTouched] = useState(false);

  const run = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get(`/api/v1/users/search?q=${encodeURIComponent(q)}`);
      setResults(data.users ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    // Debounced: a request per keystroke is both wasteful and, against the rate
    // limiter, self-defeating.
    const t = setTimeout(() => {
      setTouched(true);
      run(query);
    }, 300);
    return () => clearTimeout(t);
  }, [query, run]);

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/play" className="text-sm text-night-400 transition-colors hover:text-white">
          &larr; Back to play
        </Link>

        <h1 className="mt-4 font-display text-3xl tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-night-400">
          Every account on Aurora, including anyone who has since changed their name.
        </p>

        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username"
          className="mt-6 w-full rounded-lg border border-night-700 bg-night-800 px-4 py-3 text-night-200 placeholder:text-night-400 focus:border-aurora-cyan focus:outline-none"
        />

        {searching && <p className="mt-4 text-sm text-night-400">Searching...</p>}

        {!searching && touched && query.trim() && results.length === 0 && (
          <p className="mt-6 text-sm text-night-400">
            Nobody by that name. Names are matched exactly, so check the spelling.
          </p>
        )}

        <ul className="mt-6 space-y-2">
          {results.map((u) => (
            <li key={u.id}>
              <Link
                href={`/profile/${u.username}`}
                className="flex items-center justify-between rounded-lg bg-night-900 px-4 py-3 ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
              >
                <span>
                  <PlayerName
                    username={u.username}
                    title={u.titleManual ?? u.titleAuto ?? null}
                    countryCode={u.countryCode ?? null}
                    staffRank={u.staffRank ?? null}
                  />
                  {u.matchedFormerName && (
                    <span className="mt-0.5 block text-xs text-night-400">
                      previously {u.matchedFormerName}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-sm text-night-400">{u.rating}</span>
              </Link>
            </li>
          ))}
        </ul>

        {user && (
          <p className="mt-10 text-center text-xs text-night-400">
            Looking for someone you already know?{" "}
            <Link href="/friends" className="text-aurora-cyan hover:underline">
              Your friends list
            </Link>{" "}
            has its own filter.
          </p>
        )}
      </div>
    </main>
  );
}
