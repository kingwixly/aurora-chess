"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flag, PlayerName } from "@aurora/ui";
import type { Title } from "@aurora/chess";
import api from "../lib/api";

/**
 * A player's public record, on hover.
 *
 * Shown beside the board so you can size up an opponent without leaving the
 * game. Everything here is already public on their profile - this saves a
 * navigation, it does not reveal anything new.
 *
 * Deliberately hover-and-focus rather than click: clicking the name goes to
 * the profile, which is what people expect a name to do. This is the glance.
 */

interface Summary {
  username: string;
  rating: number;
  title?: Title | null;
  countryCode?: string | null;
  createdAt?: string;
  wins?: number;
  losses?: number;
  draws?: number;
  gamesPlayed?: number;
  badges?: { id: string; name: string; icon: string }[];
}

/** Cached per username for the session - an opponent gets hovered repeatedly. */
const cache = new Map<string, Summary | null>();

export default function PlayerHoverCard({
  username,
  children,
  side = "bottom",
}: {
  username: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Summary | null>(cache.get(username) ?? null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || data || cache.has(username)) return;
    let cancelled = false;
    setLoading(true);
    api
      // The profile endpoint already returns everything this card shows, so
      // there is no separate summary route to keep in sync.
      .get(`/api/v1/users/${encodeURIComponent(username)}`)
      .then((res) => {
        if (cancelled) return;
        cache.set(username, res.data.user ?? null);
        setData(res.data.user ?? null);
      })
      .catch(() => {
        // A private or missing profile is not an error worth surfacing; the
        // card simply shows what it has.
        if (!cancelled) cache.set(username, null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, username, data]);

  // A short delay stops the card flashing as the pointer crosses the name on
  // its way somewhere else.
  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 350);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 120);
  };

  const total =
    data?.gamesPlayed ?? (data ? (data.wins ?? 0) + (data.losses ?? 0) + (data.draws ?? 0) : 0);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {open && (
        <span
          role="tooltip"
          className={`absolute left-0 z-50 w-60 rounded-xl bg-night-900 p-3 text-left shadow-xl ring-1 ring-inset ring-night-700 ${
            side === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {loading && !data ? (
            <span className="block text-xs text-night-400">Loading...</span>
          ) : data ? (
            <>
              <span className="flex items-center gap-2">
                {data.countryCode && <Flag code={data.countryCode} size={14} />}
                <PlayerName
                  username={data.username}
                  title={data.title ?? null}
                  size="sm"
                  href={`/profile/${data.username}`}
                />
              </span>

              <span className="mt-2 block font-mono text-lg tabular-nums">{data.rating}</span>

              {total > 0 && (
                <span className="mt-1 block text-xs text-night-400">
                  {data.wins ?? 0}W / {data.losses ?? 0}L / {data.draws ?? 0}D
                  <span className="ml-1 opacity-70">
                    ({Math.round(((data.wins ?? 0) / total) * 100)}% wins)
                  </span>
                </span>
              )}

              {total > 0 && <span className="block text-xs text-night-400">{total} games</span>}

              {data.createdAt && (
                <span className="mt-1 block text-xs text-night-400">
                  Joined {new Date(data.createdAt).toLocaleDateString()}
                </span>
              )}

              {data.badges && data.badges.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-1">
                  {data.badges.slice(0, 6).map((b) => (
                    <span
                      key={b.id}
                      title={b.name}
                      className="rounded bg-night-800 px-1.5 py-0.5 text-xs"
                    >
                      {b.icon}
                    </span>
                  ))}
                </span>
              )}

              <Link
                href={`/profile/${data.username}`}
                className="mt-2 block text-xs text-aurora-cyan hover:underline"
              >
                Full profile
              </Link>
            </>
          ) : (
            <span className="block text-xs text-night-400">
              Nothing public to show for this player.
            </span>
          )}
        </span>
      )}
    </span>
  );
}
