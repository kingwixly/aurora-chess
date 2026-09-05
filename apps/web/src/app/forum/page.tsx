"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "../../lib/api";
import { AuroraBand, PlayerName, Flag } from "@aurora/ui";
import type { Title } from "@aurora/chess";
import { useAuthStore } from "../../stores/auth";

interface Author {
  id: string;
  username: string;
  titleManual?: Title | null;
  titleAuto?: Title | null;
  countryCode?: string | null;
  staffRank?: string | null;
}

interface Thread {
  id: string;
  title: string;
  category: string;
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  lastReplyAt: string;
  createdAt: string;
  author: Author;
}

const LABELS: Record<string, string> = {
  general: "General",
  help: "Help",
  feedback: "Feedback",
  "off-topic": "Off topic",
};

export default function ForumPage() {
  const { user } = useAuthStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [category, setCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Query string built separately so the path stays a plain literal - the
      // route checker parses these, and an interpolated path reads as a route
      // that does not exist.
      const query = category ? `?category=${encodeURIComponent(category)}` : "";
      const { data } = await api.get("/api/v1/forum/threads" + query);
      setThreads(data.threads ?? []);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Every other page has a route out. Without this the forum index is
            a dead end reachable only from the nav you have just left. */}
        <Link href="/play" className="text-sm text-night-400 hover:text-white">
          &larr; Back to play
        </Link>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight">Forum</h1>
            <p className="mt-1 text-sm text-night-400">
              Ask questions, report problems, argue about openings.
            </p>
          </div>
          {user && (
            <Link
              href="/forum/new"
              className="rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950"
            >
              New thread
            </Link>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-1">
          {["", "general", "help", "feedback", "off-topic"].map((c) => (
            <button
              key={c || "all"}
              onClick={() => setCategory(c)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                category === c
                  ? "bg-aurora-cyan text-night-950"
                  : "bg-night-800 text-night-200 hover:bg-night-700"
              }`}
            >
              {c ? LABELS[c] : "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-night-400">Loading...</p>
        ) : threads.length === 0 ? (
          <div className="mt-8 rounded-xl bg-night-900 p-8 text-center ring-1 ring-inset ring-night-700">
            <p className="text-sm text-night-300">Nothing here yet.</p>
            {user ? (
              <Link
                href="/forum/new"
                className="mt-3 inline-block rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950"
              >
                Start the first thread
              </Link>
            ) : (
              <p className="mt-2 text-xs text-night-400">
                <Link href="/login" className="text-aurora-cyan hover:underline">
                  Sign in
                </Link>{" "}
                to post.
              </p>
            )}
          </div>
        ) : (
          <ul className="mt-6 space-y-2">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/forum/${t.id}`}
                  className="block rounded-xl bg-night-900 px-4 py-3 ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {t.pinned && (
                        <span className="mr-1.5 rounded bg-aurora-cyan/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-aurora-cyan">
                          pinned
                        </span>
                      )}
                      {t.locked && (
                        <span className="mr-1.5 rounded bg-night-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-night-400">
                          locked
                        </span>
                      )}
                      {t.title}
                    </span>
                    <span className="shrink-0 text-xs text-night-400">
                      {t.replyCount} {t.replyCount === 1 ? "reply" : "replies"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-night-400">
                    {t.author.countryCode && <Flag code={t.author.countryCode} size={11} />}
                    <PlayerName
                      username={t.author.username}
                      title={t.author.titleManual ?? t.author.titleAuto ?? null}
                      staffRank={t.author.staffRank ?? null}
                      size="sm"
                    />
                    <span>in {LABELS[t.category] ?? t.category}</span>
                    <span>&middot; {new Date(t.lastReplyAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
