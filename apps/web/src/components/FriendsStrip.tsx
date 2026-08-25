"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayerName } from "@aurora/ui";
import api from "../lib/api";

interface Friend {
  id: string;
  username: string;
  rating: number;
  isOnline: boolean;
  title?: string | null;
  fideVerified?: boolean;
  staffRank?: string | null;
  countryCode?: string | null;
  modShield?: boolean;
  activeFlair?: string | null;
}

/**
 * Friends who are online, with a one-tap challenge.
 *
 * The most-repeated complaint about the big sites in our research was that
 * starting a game with a friend is unreasonably hard — they do not appear
 * anywhere you already are, so playing someone you know takes more steps than
 * playing a stranger. This puts them on the page you land on.
 *
 * Renders nothing when nobody is online: an empty strip saying "no friends
 * online" is a small daily reminder of it.
 */
export default function FriendsStrip() {
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api
        .get("/api/v1/friends")
        .then(({ data }) => {
          if (!cancelled) {
            setFriends((data.friends ?? []).filter((f: Friend) => f.isOnline));
          }
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (friends.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-xs uppercase tracking-wider text-night-400">
        Friends online ({friends.length})
      </h2>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {friends.map((f) => (
          <li
            key={f.id}
            className="flex shrink-0 items-center gap-3 rounded-xl bg-night-900 px-4 py-3 ring-1 ring-inset ring-night-700"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
            <Link href={`/profile/${f.username}`} className="min-w-0">
              <PlayerName
                username={f.username}
                title={f.title as never}
                fideVerified={f.fideVerified}
                staffRank={f.staffRank}
                countryCode={f.countryCode}
                modShield={f.modShield}
                flair={f.activeFlair}
                rating={f.rating}
                size="sm"
              />
            </Link>
            <Link
              href={`/play/friend?opponent=${encodeURIComponent(f.username)}`}
              className="shrink-0 rounded-lg bg-aurora-cyan px-3 py-1.5 text-xs font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8]"
            >
              Challenge
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
