"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth";
import SignedOut from "../../../components/SignedOut";

interface Punishment {
  id: string;
  type: string;
  reason: string;
  effect: string;
  expiresAt: string | null;
  liftedAt: string | null;
  liftReason: string | null;
  overturnedAt: string | null;
  becameStrikeAt: string | null;
  createdAt: string;
  active: boolean;
  canAppeal: boolean;
}

interface Appeal {
  id: string;
  punishmentId: string;
  status: string;
  decision?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

const STATUS_TONE: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-800 ring-amber-600/30",
  TRIAGED: "bg-blue-50 text-blue-800 ring-blue-600/30",
  ACCEPTED: "bg-emerald-50 text-emerald-800 ring-emerald-600/30",
  DENIED: "bg-[#eef1f7] text-[#5a6478] ring-[#c9d2e0]",
};

/**
 * The full record, including everything that has already expired.
 *
 * Separate from the overview on purpose: the overview answers "what applies to
 * me right now", this answers "what has ever happened". Someone contesting an
 * old warning needs the second, and burying it under the first made the record
 * look like it only held live actions.
 */
export default function HistoryPage() {
  const { user, isLoading, fetchMe, sessionError } = useAuthStore();
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/standing");
      setPunishments(data.punishments ?? []);
      setAppeals(data.appeals ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-[#5a6478]">Loading...</p>
      </div>
    );
  }
  if (!user) return <SignedOut error={sessionError} />;

  const appealsFor = (id: string) => appeals.filter((a) => a.punishmentId === id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-3xl tracking-tight">Full history</h1>
      <p className="mt-2 text-sm text-[#5a6478]">
        Everything on your record, including actions that have already expired and any appeal you
        have made.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-[#5a6478]">Loading...</p>
      ) : punishments.length === 0 ? (
        <div className="mt-8 rounded-xl bg-white p-8 text-center ring-1 ring-inset ring-[#dde1ea]">
          <p className="font-display text-xl text-emerald-700">Nothing on your record</p>
          <p className="mt-1 text-sm text-[#5a6478]">
            No action has ever been taken on your account.
          </p>
        </div>
      ) : (
        <ol className="mt-8 space-y-4">
          {punishments.map((p) => {
            const related = appealsFor(p.id);
            return (
              <li
                key={p.id}
                className="overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-[#dde1ea]"
              >
                <div className="border-b border-[#dde1ea] px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-lg capitalize">
                      {p.type.toLowerCase()}
                      {p.active && (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 align-middle text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/30">
                          active
                        </span>
                      )}
                      {p.overturnedAt && (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 align-middle text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/30">
                          overturned
                        </span>
                      )}
                      {!p.active && !p.overturnedAt && p.becameStrikeAt && (
                        <span className="ml-2 rounded-full bg-[#eef1f7] px-2 py-0.5 align-middle text-xs font-medium text-[#5a6478] ring-1 ring-inset ring-[#c9d2e0]">
                          expired
                        </span>
                      )}
                    </h2>
                    <time className="font-mono text-xs text-[#6b7488]">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-[#3c4658]">{p.effect}</p>
                </div>

                <dl className="divide-y divide-[#dde1ea] text-sm">
                  <div className="flex gap-3 px-5 py-2.5">
                    <dt className="w-24 shrink-0 text-[#6b7488]">Reason</dt>
                    <dd className="text-[#0A0F1C]">{p.reason}</dd>
                  </div>
                  <div className="flex gap-3 px-5 py-2.5">
                    <dt className="w-24 shrink-0 text-[#6b7488]">Ends</dt>
                    <dd className="text-[#0A0F1C]">
                      {p.overturnedAt
                        ? `Overturned on ${new Date(p.overturnedAt).toLocaleDateString()}`
                        : p.liftedAt
                          ? `Lifted early on ${new Date(p.liftedAt).toLocaleDateString()}`
                          : p.expiresAt
                            ? new Date(p.expiresAt).toLocaleDateString()
                            : "Permanent"}
                    </dd>
                  </div>
                  {p.liftReason && (
                    <div className="flex gap-3 px-5 py-2.5">
                      <dt className="w-24 shrink-0 text-[#6b7488]">Lifted</dt>
                      <dd className="text-[#0A0F1C]">{p.liftReason}</dd>
                    </div>
                  )}
                </dl>

                {related.length > 0 && (
                  <div className="border-t border-[#dde1ea] bg-[#f6f7fb] px-5 py-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6b7488]">
                      Appeals
                    </p>
                    <ul className="space-y-2">
                      {related.map((a) => (
                        <li key={a.id} className="text-sm">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                              STATUS_TONE[a.status] ?? STATUS_TONE.DENIED
                            }`}
                          >
                            {a.status.toLowerCase()}
                          </span>
                          <span className="ml-2 text-[#6b7488]">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </span>
                          {a.decision && (
                            <p className="mt-1 text-[#3c4658]">
                              <span className="text-[#6b7488]">Decision: </span>
                              {a.decision}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {p.canAppeal && (
                  <div className="border-t border-[#dde1ea] px-5 py-3">
                    <Link
                      href={`/standing/appeal?punishment=${p.id}`}
                      className="text-sm font-medium text-[#0A5C86] underline-offset-2 hover:underline"
                    >
                      Appeal this
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
