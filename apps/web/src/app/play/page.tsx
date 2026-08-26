"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AuroraBand, PlayerName } from "@aurora/ui";
import SignedOut from "../../components/SignedOut";
import { useAuthStore } from "../../stores/auth";
import { connectSocket, disconnectSocket, getSocket } from "../../lib/socket";
import { useOnlineStatus } from "../../lib/useOnlineStatus";
import { useInstallPrompt } from "../../lib/useInstallPrompt";
import ActivityFeed from "../../components/ActivityFeed";
import ChallengePopup from "../../components/ChallengePopup";
import ErrorBoundary from "../../components/ErrorBoundary";
import MiniBoard from "../../components/MiniBoard";
import TimeControlPanel, { type TimeControlChoice } from "../../components/TimeControlPanel";
import RatingPools from "../../components/RatingPools";
import MobileNav from "../../components/MobileNav";

/**
 * Quick-pairing presets.
 *
 * These are the primary action of the site, so they lead and they are one tap
 * deep. Grouped by the pool they rate into, which is also how titles are
 * earned -- a player chasing BM can see which tiles feed it.
 */
const QUICK_PLAY = [
  { label: "1+0", name: "Bullet", minutes: 1, increment: 0 },
  { label: "2+1", name: "Bullet", minutes: 2, increment: 1 },
  { label: "3+0", name: "Blitz", minutes: 3, increment: 0 },
  { label: "5+3", name: "Blitz", minutes: 5, increment: 3 },
  { label: "10+0", name: "Rapid", minutes: 10, increment: 0 },
  { label: "15+10", name: "Rapid", minutes: 15, increment: 10 },
  { label: "30+0", name: "Classical", minutes: 30, increment: 0 },
  { label: "30+20", name: "Classical", minutes: 30, increment: 20 },
] as const;

/** Positions used only as card artwork. */
const ART = {
  tactics: "r4rk1/pp3ppp/2n1b3/q7/3P4/2P1BN2/P4PPP/R2Q1RK1 w - - 0 1",
  endgame: "8/5pk1/6p1/8/8/1R6/5PPP/6K1 w - - 0 1",
  opening: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
};

export default function PlayPage() {
  const router = useRouter();
  const { user, isLoading, fetchMe, logout, sessionError } = useAuthStore();
  const isOnline = useOnlineStatus();
  const { canInstall, install } = useInstallPrompt();
  const [chosen, setChosen] = useState<TimeControlChoice | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) fetchMe();
  }, [user, fetchMe]);

  // No auto-redirect: SignedOut renders in place with a way forward. Bouncing
  // to /login raced the render and produced a blank flash, and if /login also
  // bounced back there was no way out of the loop.

  useEffect(() => {
    if (user) {
      connectSocket();
      return () => disconnectSocket();
    }
  }, [user]);

  // Live waiting counts. Polled rather than pushed: the dashboard is not
  // latency-critical, and a broadcast on every queue change would wake every
  // connected client for a number most of them are not looking at.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const onCounts = (data: Record<string, number>) => setCounts(data ?? {});
    socket.on("queue:counts", onCounts);
    socket.emit("queue:counts");
    const id = setInterval(() => socket.emit("queue:counts"), 5000);

    return () => {
      clearInterval(id);
      socket.off("queue:counts", onCounts);
    };
  }, [user]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night-950">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }

  // Never render nothing: a blank page with no way out is the worst
  // possible response to an expired or failed session.
  if (!user) return <SignedOut error={sessionError} />;

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />

      <header className="border-b border-night-700">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/play" className="flex items-center gap-2.5">
            <Image src="/logo-mark.png" alt="Aurora Chess" width={28} height={28} />
            <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
              Aurora
            </span>
          </Link>

          <nav className="hidden gap-1 md:flex">
            {[
              { href: "/play", label: "Play" },
              { href: "/history", label: "Games" },
              { href: "/stats", label: "Stats" },
              { href: "/puzzles", label: "Puzzles" },
              { href: "/analysis", label: "Analysis" },
              { href: "/leaderboard", label: "Leaderboard" },
              { href: "/events", label: "Events" },
              { href: "/search", label: "Search" },
              { href: "/friends", label: "Friends" },
              { href: "/messages", label: "Messages" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-night-400 transition-colors hover:bg-night-800 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="relative flex items-center gap-2">
            <MobileNav />
            <span
              className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-red-400"}`}
              title={isOnline ? "Connected" : "No connection"}
            />
            {user.role === "ADMIN" && isOnline && (
              <a
                href={process.env.NEXT_PUBLIC_ADMIN_URL || "#"}
                className="rounded-lg px-3 py-1.5 text-sm text-night-400 transition-colors hover:text-white"
              >
                Admin
              </a>
            )}
            <Link
              href={`/profile/${user.username}`}
              className="rounded-lg px-2 py-1.5 transition-colors hover:bg-night-800"
            >
              <PlayerName
                username={user.username}
                title={user.title}
                fideVerified={user.fideVerified}
                modShield={user.modShield}
                flair={user.activeFlair}
                rating={user.rating}
                size="sm"
              />
            </Link>
            <Link
              href="/settings"
              aria-label="Settings"
              title="Settings"
              className="rounded-lg px-2 py-1.5 text-night-400 transition-colors hover:text-white"
            >
              {/* Gear */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              disabled={!isOnline}
              className="rounded-lg px-2 py-1.5 text-sm text-night-400 transition-colors hover:text-white disabled:opacity-40"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Quick pairing leads. One tap from landing to a game. */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            <h1 className="sr-only">Play</h1>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {QUICK_PLAY.map((tc) => {
                const waiting = counts[`${tc.minutes}+${tc.increment}`] ?? 0;
                return (
                  <button
                    key={tc.label}
                    onClick={() => setChosen(tc)}
                    className="group relative rounded-xl bg-night-900 py-6 text-center ring-1 ring-inset ring-night-700 transition-all hover:bg-night-800 hover:ring-aurora-cyan/60"
                  >
                    {/* Only shown when someone is actually waiting -- a row of
                        zeroes would read as "nobody plays here". */}
                    {waiting > 0 && (
                      <span
                        className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-aurora-cyan/15 px-2 py-0.5 font-mono text-[10px] text-aurora-cyan"
                        title={`${waiting} waiting`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-aurora-cyan" />
                        {waiting}
                      </span>
                    )}
                    <div className="font-mono text-2xl font-bold tracking-tight">{tc.label}</div>
                    <div className="mt-0.5 text-xs uppercase tracking-wider text-night-400 transition-colors group-hover:text-aurora-cyan">
                      {tc.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-2.5">
            <Link
              href="/play/friend"
              className="flex items-center gap-3 rounded-xl bg-aurora-cyan px-5 py-4 font-semibold text-night-950 transition-transform hover:scale-[1.01] motion-reduce:hover:scale-100 font-display"
            >
              Challenge a friend
            </Link>
            <Link
              href="/play/bot"
              className="flex items-center gap-3 rounded-xl bg-night-900 px-5 py-4 font-semibold ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800 font-display"
            >
              Play the engine
            </Link>
            <Link
              href="/analysis"
              className="flex items-center gap-3 rounded-xl bg-night-900 px-5 py-4 font-semibold ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800 font-display"
            >
              Analysis board
            </Link>
          </aside>
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-xs uppercase tracking-wider text-night-400">Your ratings</h2>
          <RatingPools ratings={user.ratings} />
        </section>

        <AuroraBand className="my-8 opacity-25" />

        {/* Feature cards. Board artwork gives them the visual weight that a
            list of links does not have. */}
        <div className="grid gap-5 md:grid-cols-3">
          <article className="overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
            <div className="p-4 pb-0">
              <MiniBoard fen={ART.tactics} />
            </div>
            <div className="p-5">
              <h2 className="font-display text-xl">Puzzles</h2>
              <p className="mt-1 text-sm text-night-400">
                Sharpen your tactics. Reach the top 5% and you are a Puzzle Master.
              </p>
              <Link
                href="/puzzles"
                className="mt-4 inline-block rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8] font-display"
              >
                Solve puzzles
              </Link>
            </div>
          </article>

          <article className="overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
            <div className="p-4 pb-0">
              <MiniBoard fen={ART.endgame} />
            </div>
            <div className="p-5">
              <h2 className="font-display text-xl">Your statistics</h2>
              <p className="mt-1 text-sm text-night-400">
                Ratings by time control, streaks, and the openings you actually play.
              </p>
              <Link
                href="/stats"
                className="mt-4 inline-block rounded-lg bg-night-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-night-700"
              >
                Open stats
              </Link>
            </div>
          </article>

          <article className="overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
            <div className="p-4 pb-0">
              <MiniBoard fen={ART.opening} />
            </div>
            <div className="p-5">
              <h2 className="font-display text-xl">Collections</h2>
              <p className="mt-1 text-sm text-night-400">
                Save games worth returning to and group them how you like.
              </p>
              <Link
                href="/collections"
                className="mt-4 inline-block rounded-lg bg-night-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-night-700"
              >
                Open collections
              </Link>
            </div>
          </article>
        </div>

        {isOnline && (
          <section className="mt-8 rounded-xl bg-night-900 p-5 ring-1 ring-inset ring-night-700">
            <h2 className="mb-3 text-xs uppercase tracking-wider text-night-400">
              Recent activity
            </h2>
            <ErrorBoundary>
              <ActivityFeed />
            </ErrorBoundary>
          </section>
        )}

        {canInstall && (
          <button
            onClick={install}
            className="mt-5 w-full rounded-xl bg-night-900 px-5 py-4 text-left ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
          >
            <span className="font-medium">Install Aurora</span>
            <span className="mt-0.5 block text-sm text-night-400">Play from your home screen</span>
          </button>
        )}

        {/* Deliberately below the fold: this is for a specific situation, not
            the main way anyone plays. Findable when you want it, not competing
            with the buttons people came for. */}
        <section className="mt-10 border-t border-night-700 pt-6">
          <Link
            href="/play/otb"
            className="flex items-center justify-between rounded-xl bg-night-900 px-4 py-3 ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
          >
            <span>
              <span className="block text-sm font-medium">Play in person</span>
              <span className="block text-xs text-night-400">
                Real board, one device as the clock. Works offline.
              </span>
            </span>
            <span aria-hidden="true" className="text-night-400">
              &rarr;
            </span>
          </Link>
        </section>
      </div>

      <TimeControlPanel
        choice={chosen}
        waiting={chosen ? (counts[`${chosen.minutes}+${chosen.increment}`] ?? 0) : 0}
        onClose={() => setChosen(null)}
      />
      <ChallengePopup />
    </main>
  );
}
