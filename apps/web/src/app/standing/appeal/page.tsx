"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuroraBand } from "@aurora/ui";
import api from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth";
import SignedOut from "../../../components/SignedOut";

interface Appealable {
  id: string;
  type: string;
  reason: string;
  createdAt: string;
  canAppeal: boolean;
}

function AppealForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isLoading, fetchMe, sessionError } = useAuthStore();

  const [options, setOptions] = useState<Appealable[]>([]);
  const [selected, setSelected] = useState(params.get("punishment") ?? "");
  const [body, setBody] = useState("");
  const [usePublic, setUsePublic] = useState(false);
  const [discord, setDiscord] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const load = useCallback(async () => {
    const { data } = await api.get("/api/v1/standing");
    const appealable = (data.punishments ?? []).filter((p: Appealable) => p.canAppeal);
    setOptions(appealable);
    if (!selected && appealable.length === 1) setSelected(appealable[0].id);
  }, [selected]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function submit() {
    if (!selected || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.post("/api/v1/standing/appeal", {
        punishmentId: selected,
        body: body.trim(),
        discordHandle: usePublic && discord.trim() ? discord.trim() : undefined,
      });
      setDone(true);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Could not submit"
      );
    } finally {
      setSending(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night-950">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }
  if (!user) return <SignedOut error={sessionError} />;

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/standing" className="text-sm text-night-400 hover:text-white">
          &larr; Your standing
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Appeal</h1>

        {done ? (
          <div className="mt-6 rounded-xl bg-night-900 p-6 ring-1 ring-inset ring-emerald-500/40">
            <p className="font-display text-xl text-emerald-400">Appeal submitted</p>
            <p className="mt-1 text-sm text-night-400">
              A moderator will read it and record a decision with their reasoning. You will see it
              on your standing page.
            </p>
            <Link
              href="/standing"
              className="mt-4 inline-block rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950"
            >
              Back to standing
            </Link>
          </div>
        ) : options.length === 0 ? (
          <div className="mt-6 rounded-xl bg-night-900 p-6 ring-1 ring-inset ring-night-700">
            <p className="font-display text-xl">Nothing to appeal</p>
            <p className="mt-1 text-sm text-night-400">
              There is no action on your account that can be contested right now. Your standing page
              explains why if something is listed there.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-night-400">
              Tell us what happened. A person reads every appeal and records their reasoning.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Which action</span>
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full rounded-lg border border-night-700 bg-night-800 px-3.5 py-2.5 outline-none focus:border-aurora-cyan"
                >
                  <option value="">Choose...</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.type.toLowerCase()} &mdash; {new Date(o.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Your case</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  maxLength={4000}
                  placeholder="What happened, and why you think the decision was wrong."
                  className="w-full rounded-lg border border-night-700 bg-night-800 px-3.5 py-2.5 text-sm outline-none focus:border-aurora-cyan"
                />
                <span className="mt-1 block text-xs text-night-500">{body.length} / 4000</span>
              </label>

              <div className="rounded-xl bg-night-900 p-4 ring-1 ring-inset ring-night-700">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={usePublic}
                    onChange={(e) => setUsePublic(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Also post this publicly for faster review</span>
                    <span className="mt-1 block text-sm text-night-400">
                      Volunteers read the public appeal forum and flag genuine cases for a
                      moderator, which is usually quicker. Entirely optional — this appeal is
                      already submitted either way, and posting publicly does not change your place
                      in the queue.
                    </span>
                    <span className="mt-1 block text-sm text-night-400">
                      You can delete the public post at any time with no effect on your appeal.
                    </span>
                  </span>
                </label>

                {usePublic && (
                  <input
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                    placeholder="Your Discord handle"
                    className="mt-3 w-full rounded-lg border border-night-700 bg-night-800 px-3.5 py-2 text-sm outline-none focus:border-aurora-cyan"
                  />
                )}
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-500/30">
                  {error}
                </p>
              )}

              <button
                onClick={submit}
                disabled={sending || !selected || !body.trim()}
                className="w-full rounded-lg bg-aurora-cyan py-3 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8] disabled:opacity-40"
              >
                {sending ? "Submitting..." : "Submit appeal"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/** `useSearchParams` needs a boundary or the route cannot be prerendered. */
export default function AppealPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-night-950" />}>
      <AppealForm />
    </Suspense>
  );
}
