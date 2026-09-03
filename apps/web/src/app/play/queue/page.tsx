"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuroraBand } from "@aurora/ui";
import { useAuthStore } from "../../../stores/auth";
import { getSocket, connectSocket } from "../../../lib/socket";
import QueueSnake from "../../../components/QueueSnake";

const PRESETS = [
  { label: "1+0", minutes: 1, increment: 0 },
  { label: "3+0", minutes: 3, increment: 0 },
  { label: "5+3", minutes: 5, increment: 3 },
  { label: "10+0", minutes: 10, increment: 0 },
  { label: "15+10", minutes: 15, increment: 10 },
  { label: "30+0", minutes: 30, increment: 0 },
] as const;

/**
 * Random-opponent queue.
 *
 * The wait is the problem this page solves. Rather than a spinner, it gives you
 * something to do and tells you honestly what is happening: how long you have
 * waited, and that the rating window widens the longer you wait - so a strong
 * player on a quiet server understands why they are still here.
 */
function QueueContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoading, fetchMe } = useAuthStore();

  const [tc, setTc] = useState(() => {
    const m = Number(params.get("minutes"));
    const i = Number(params.get("increment"));
    const found = PRESETS.find((p) => p.minutes === m && p.increment === i);
    return found ?? PRESETS[2];
  });
  const [searching, setSearching] = useState(false);
  const [waited, setWaited] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) fetchMe();
  }, [user, fetchMe]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) connectSocket();
  }, [user]);

  // Socket wiring lives in one effect so the listeners are always torn down
  // together -- a stale queue:matched handler would navigate you into a game
  // you already left.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMatched = ({ gameId }: { gameId: string }) => {
      setSearching(false);
      router.push(`/game/${gameId}`);
    };
    const onError = ({ message }: { message: string }) => {
      setSearching(false);
      setError(message);
    };

    socket.on("queue:matched", onMatched);
    socket.on("queue:error", onError);
    return () => {
      socket.off("queue:matched", onMatched);
      socket.off("queue:error", onError);
    };
  }, [router]);

  // Leave the queue if the page is closed mid-search, so nobody is paired into
  // a game with someone who has navigated away.
  useEffect(() => {
    return () => {
      getSocket()?.emit("queue:leave");
    };
  }, []);

  useEffect(() => {
    if (!searching) {
      setWaited(0);
      return;
    }
    const id = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => clearInterval(id);
  }, [searching]);

  const start = useCallback(() => {
    setError(null);
    setSearching(true);
    getSocket()?.emit("queue:join", { minutes: tc.minutes, increment: tc.increment });
  }, [tc]);

  const stop = useCallback(() => {
    setSearching(false);
    getSocket()?.emit("queue:leave");
  }, []);

  if (isLoading || !user) return null;

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/play" className="text-sm text-night-400 transition-colors hover:text-white">
          &larr; Back to play
        </Link>

        <h1 className="mt-4 font-display text-3xl tracking-tight">Quick play</h1>
        <p className="mt-1 text-night-400">
          Paired with whoever is closest to your rating and waiting.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-inset ring-red-500/30">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="mb-3 text-xs uppercase tracking-wider text-night-400">Time control</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => !searching && setTc(p)}
                  disabled={searching}
                  className={`rounded-xl py-5 font-mono text-xl font-bold ring-1 ring-inset transition-colors disabled:opacity-40 ${
                    tc.label === p.label
                      ? "bg-night-800 text-white ring-aurora-cyan"
                      : "bg-night-900 ring-night-700 hover:bg-night-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {searching ? (
                <div className="rounded-xl bg-night-900 p-5 ring-1 ring-inset ring-night-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-xl">Finding an opponent</p>
                      <p className="mt-1 text-sm text-night-400">
                        Waiting {waited}s &middot; rating window widens as you wait
                      </p>
                    </div>
                    <span className="h-3 w-3 animate-pulse rounded-full bg-aurora-cyan motion-reduce:animate-none" />
                  </div>
                  <button
                    onClick={stop}
                    className="mt-4 rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={start}
                  className="w-full rounded-xl bg-aurora-cyan px-6 py-4 text-lg font-semibold text-night-950 transition-transform hover:scale-[1.01] motion-reduce:hover:scale-100"
                >
                  Find opponent
                </button>
              )}
            </div>
          </div>

          <aside>
            <h2 className="mb-3 text-xs uppercase tracking-wider text-night-400">While you wait</h2>
            <QueueSnake />
          </aside>
        </div>
      </div>
    </main>
  );
}

/**
 * `useSearchParams` forces client-side rendering for its subtree, so Next
 * requires a Suspense boundary above it or the build cannot prerender this
 * route at all. The fallback is deliberately the page's own chrome rather than
 * a spinner, so nothing jumps when the real content swaps in.
 */
export default function QueuePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-night-950">
          <AuroraBand />
          <div className="mx-auto max-w-4xl px-6 py-10">
            <h1 className="font-display text-3xl tracking-tight">Quick play</h1>
            <p className="mt-1 text-night-400">Loading...</p>
          </div>
        </main>
      }
    >
      <QueueContent />
    </Suspense>
  );
}
