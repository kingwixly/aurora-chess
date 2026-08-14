"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuroraBand } from "@aurora/ui";
import api from "../../lib/api";
import { useAuthStore } from "../../stores/auth";
import SignedOut from "../../components/SignedOut";

interface Punishment {
  id: string;
  type: string;
  reason: string;
  effect: string;
  expiresAt: string | null;
  liftedAt: string | null;
  liftReason: string | null;
  overturnedAt: string | null;
  createdAt: string;
  active: boolean;
  canAppeal: boolean;
  appealBlockedBecause: string | null;
}

interface Standing {
  punishments: Punishment[];
  appeals: { id: string; punishmentId: string; status: string; createdAt: string }[];
  automaticTitlesBlocked: boolean;
  automaticTitlesUnblockedAt: string | null;
  strikeWindowMonths: number;
  appealBanned: boolean;
}

const BLOCK_REASONS: Record<string, string> = {
  "too-short": "Bans shorter than three days cannot be appealed — they end before a review would.",
  "appeals-disabled": "A moderator has closed appeals on this action.",
  "already-open": "You already have an open appeal for this.",
  "three-denials": "This has been appealed three times without success.",
  "appeal-banned": "Your account cannot submit appeals.",
};

const TONE: Record<string, string> = {
  WARNING: "ring-amber-500/40 bg-amber-500/5",
  RESTRICTION: "ring-amber-500/40 bg-amber-500/5",
  SUSPENSION: "ring-orange-500/40 bg-orange-500/5",
  DEACTIVATION: "ring-red-500/40 bg-red-500/5",
  BAN: "ring-red-500/50 bg-red-500/10",
};

export default function StandingPage() {
  const { user, isLoading, fetchMe, sessionError } = useAuthStore();
  const [data, setData] = useState<Standing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/standing");
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night-950">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }
  if (!user) return <SignedOut error={sessionError} />;

  const active = data?.punishments.filter((p) => p.active) ?? [];
  const history = data?.punishments.filter((p) => !p.active) ?? [];

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl tracking-tight">Your standing</h1>
        <p className="mt-1 text-sm text-night-400">
          Everything on your record, and what you can do about it.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-night-400">Loading...</p>
        ) : active.length === 0 && history.length === 0 ? (
          // Worth saying explicitly. A blank page reads as a fault; being told
          // your record is clean is information.
          <div className="mt-6 rounded-xl bg-night-900 p-6 text-center ring-1 ring-inset ring-night-700">
            <p className="font-display text-xl text-emerald-400">Nothing on your record</p>
            <p className="mt-1 text-sm text-night-400">
              No action has ever been taken on your account.
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-2 text-xs uppercase tracking-wider text-night-500">Active</h2>
                <ul className="space-y-3">
                  {active.map((p) => (
                    <li
                      key={p.id}
                      className={`rounded-xl p-5 ring-1 ring-inset ${TONE[p.type] ?? "ring-night-700 bg-night-900"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-xl capitalize">{p.type.toLowerCase()}</h3>
                        <span className="shrink-0 font-mono text-xs text-night-400">
                          {p.expiresAt
                            ? `until ${new Date(p.expiresAt).toLocaleDateString()}`
                            : "permanent"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-night-300">{p.effect}</p>
                      <p className="mt-2 rounded-lg bg-night-950/50 px-3 py-2 text-sm">
                        <span className="text-night-500">Reason: </span>
                        {p.reason}
                      </p>
                      <div className="mt-3">
                        {p.canAppeal ? (
                          <Link
                            href={`/standing/appeal?punishment=${p.id}`}
                            className="inline-block rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950"
                          >
                            Appeal this
                          </Link>
                        ) : (
                          <p className="text-xs text-night-500">
                            {BLOCK_REASONS[p.appealBlockedBecause ?? ""] ??
                              "This cannot be appealed."}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data?.automaticTitlesBlocked && (
              <section className="mt-6 rounded-xl bg-night-900 p-5 ring-1 ring-inset ring-night-700">
                <h2 className="font-display text-lg">Automatic titles paused</h2>
                <p className="mt-1 text-sm text-night-400">
                  Titles earned by rating are not awarded while a strike counts, for{" "}
                  {data.strikeWindowMonths} months.
                  {data.automaticTitlesUnblockedAt &&
                    ` Yours resume on ${new Date(
                      data.automaticTitlesUnblockedAt
                    ).toLocaleDateString()}.`}{" "}
                  Federation and staff-granted titles are unaffected.
                </p>
              </section>
            )}

            {history.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-2 text-xs uppercase tracking-wider text-night-500">History</h2>
                <ul className="divide-y divide-night-700 overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
                  {history.map((p) => (
                    <li key={p.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">
                          <span className="capitalize">{p.type.toLowerCase()}</span>
                          {p.overturnedAt && (
                            <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-300">
                              overturned
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-night-500">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-night-400">{p.reason}</p>
                      {p.canAppeal && (
                        <Link
                          href={`/standing/appeal?punishment=${p.id}`}
                          className="mt-1.5 inline-block text-xs font-medium text-aurora-cyan hover:underline"
                        >
                          Appeal this
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <p className="mt-8 text-center text-xs text-night-500">
          Every action here was issued by a person, not a script.{" "}
          <Link href="/fair-play" className="text-aurora-cyan hover:underline">
            How moderation works
          </Link>
        </p>
      </div>
    </main>
  );
}
