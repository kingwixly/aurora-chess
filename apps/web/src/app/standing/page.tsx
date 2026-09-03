"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  capabilities?: {
    playPublic: boolean;
    playFriends: boolean;
    playBots: boolean;
    puzzles: boolean;
    chat: boolean;
    browse: boolean;
  };
  automaticTitlesBlocked: boolean;
  automaticTitlesUnblockedAt: string | null;
  strikeWindowMonths: number;
  appealBanned: boolean;
}

const BLOCK_REASONS: Record<string, string> = {
  "too-short": "Bans shorter than three days cannot be appealed - they end before a review would.",
  "appeals-disabled": "A moderator has closed appeals on this action.",
  "already-open": "You already have an open appeal for this.",
  "three-denials": "This has been appealed three times without success.",
  "appeal-banned": "Your account cannot submit appeals.",
};

const TONE: Record<string, string> = {
  WARNING: "ring-amber-500/50 bg-amber-50",
  RESTRICTION: "ring-amber-500/50 bg-amber-50",
  SUSPENSION: "ring-orange-500/50 bg-orange-50",
  DEACTIVATION: "ring-red-500/50 bg-red-50",
  BAN: "ring-red-500/50 bg-red-50",
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
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-[#5a6478]">Loading...</p>
      </main>
    );
  }
  if (!user) return <SignedOut error={sessionError} />;

  const active = data?.punishments.filter((p) => p.active) ?? [];
  const history = data?.punishments.filter((p) => !p.active) ?? [];

  return (
    <main>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl tracking-tight">Your standing</h1>
        <p className="mt-1 text-sm text-[#5a6478]">
          Everything on your record, and what you can do about it.
        </p>

        {!loading && data && (
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[#dde1ea] sm:grid-cols-4">
            {[
              { label: "Play", ok: data.capabilities?.playPublic },
              { label: "Friends", ok: data.capabilities?.playFriends },
              { label: "Puzzles", ok: data.capabilities?.puzzles },
              { label: "Chat", ok: data.capabilities?.chat },
            ].map((c) => (
              <div key={c.label} className="bg-white px-4 py-3">
                <dt className="text-xs uppercase tracking-wider text-[#6b7488]">{c.label}</dt>
                <dd
                  className={`mt-0.5 font-display text-lg ${
                    c.ok ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {c.ok ? "Available" : "Restricted"}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-[#5a6478]">Loading...</p>
        ) : active.length === 0 && history.length === 0 ? (
          // Worth saying explicitly. A blank page reads as a fault; being told
          // your record is clean is information.
          <div className="mt-6 rounded-xl bg-white p-6 text-center ring-1 ring-inset ring-[#dde1ea]">
            <p className="font-display text-xl text-emerald-700">Nothing on your record</p>
            <p className="mt-1 text-sm text-[#5a6478]">
              No action has ever been taken on your account.
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-2 text-xs uppercase tracking-wider text-[#6b7488]">Active</h2>
                <ul className="space-y-3">
                  {active.map((p) => (
                    <li
                      key={p.id}
                      className={`rounded-xl p-5 ring-1 ring-inset ${TONE[p.type] ?? "ring-[#dde1ea] bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-xl capitalize">{p.type.toLowerCase()}</h3>
                        <span className="shrink-0 font-mono text-xs text-[#5a6478]">
                          {p.expiresAt
                            ? `until ${new Date(p.expiresAt).toLocaleDateString()}`
                            : "permanent"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#0A0F1C]">{p.effect}</p>
                      <p className="mt-2 rounded-lg bg-[#f6f7fb] px-3 py-2 text-sm">
                        <span className="text-[#6b7488]">Reason: </span>
                        {p.reason}
                      </p>
                      <div className="mt-3">
                        {p.canAppeal ? (
                          <Link
                            href={`/standing/appeal?punishment=${p.id}`}
                            className="inline-block rounded-lg bg-[#0A5C86] px-4 py-2 text-sm font-semibold text-white"
                          >
                            Appeal this
                          </Link>
                        ) : (
                          <p className="text-xs text-[#6b7488]">
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
              <section className="mt-6 rounded-xl bg-white p-5 ring-1 ring-inset ring-[#dde1ea]">
                <h2 className="font-display text-lg">Automatic titles paused</h2>
                <p className="mt-1 text-sm text-[#5a6478]">
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
                <h2 className="mb-2 text-xs uppercase tracking-wider text-[#6b7488]">History</h2>
                <ul className="divide-y divide-[#dde1ea] overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-[#dde1ea]">
                  {history.map((p) => (
                    <li key={p.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">
                          <span className="capitalize">{p.type.toLowerCase()}</span>
                          {p.overturnedAt && (
                            <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                              overturned
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-[#6b7488]">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#5a6478]">{p.reason}</p>
                      {p.canAppeal && (
                        <Link
                          href={`/standing/appeal?punishment=${p.id}`}
                          className="mt-1.5 inline-block text-xs font-medium text-[#0A5C86] hover:underline"
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

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            href="/standing/rules"
            className="rounded-xl bg-white p-4 ring-1 ring-inset ring-[#dde1ea] transition-colors hover:bg-[#f6f7fb]"
          >
            <p className="font-display text-base">Rules</p>
            <p className="mt-0.5 text-sm text-[#5a6478]">
              What is expected, and what each level of action does.
            </p>
          </Link>
          <Link
            href="/standing/how-it-works"
            className="rounded-xl bg-white p-4 ring-1 ring-inset ring-[#dde1ea] transition-colors hover:bg-[#f6f7fb]"
          >
            <p className="font-display text-base">How moderation works</p>
            <p className="mt-0.5 text-sm text-[#5a6478]">
              Who decides, what we look at, and how to appeal.
            </p>
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-[#6b7488]">
          Every action here was issued by a person, not a script.{" "}
          <Link href="/standing/how-it-works" className="text-[#0A5C86] hover:underline">
            How moderation works
          </Link>
        </p>
      </div>
    </main>
  );
}
