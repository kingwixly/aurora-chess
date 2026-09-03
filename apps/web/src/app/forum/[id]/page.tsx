"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "../../../lib/api";
import { AuroraBand, PlayerName, Flag } from "@aurora/ui";
import type { Title } from "@aurora/chess";
import { useAuthStore } from "../../../stores/auth";

interface Author {
  id: string;
  username: string;
  titleManual?: Title | null;
  titleAuto?: Title | null;
  countryCode?: string | null;
  staffRank?: string | null;
}

interface Post {
  id: string;
  body: string;
  deletedAt: string | null;
  editedAt: string | null;
  createdAt: string;
  author: Author | null;
}

interface Thread {
  id: string;
  title: string;
  category: string;
  pinned: boolean;
  locked: boolean;
  createdAt: string;
  author: Author;
  posts: Post[];
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [thread, setThread] = useState<Thread | null>(null);
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/v1/forum/threads/${id}`);
      setThread(data.thread);
    } catch {
      setThread(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    setError("");
    setPosting(true);
    try {
      await api.post(`/api/v1/forum/threads/${id}/posts`, { body: reply });
      setReply("");
      await load();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { error?: string } } })?.response;
      setError(
        res?.status === 403
          ? "Your account cannot post at the moment. Check your standing page."
          : res?.data?.error || "Could not post the reply."
      );
    } finally {
      setPosting(false);
    }
  }

  async function remove(postId: string) {
    if (!confirm("Delete this post?")) return;
    try {
      await api.delete(`/api/v1/forum/posts/${postId}`);
      await load();
    } catch {
      setError("Could not delete that post.");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night-950">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }

  if (!thread) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-night-950">
        <p className="text-night-300">That thread does not exist.</p>
        <Link href="/forum" className="text-sm text-aurora-cyan hover:underline">
          Back to the forum
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/forum" className="text-sm text-night-400 hover:text-white">
          &larr; Forum
        </Link>

        <h1 className="mt-4 font-display text-2xl leading-tight tracking-tight">{thread.title}</h1>
        {thread.locked && (
          <p className="mt-2 rounded-lg bg-night-800 px-3 py-2 text-xs text-night-400">
            This thread is locked. It can be read but not replied to.
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {thread.posts.map((p, i) => (
            <li key={p.id} className="rounded-xl bg-night-900 p-4 ring-1 ring-inset ring-night-700">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm">
                  {p.author?.countryCode && <Flag code={p.author.countryCode} size={11} />}
                  {p.author ? (
                    <PlayerName
                      username={p.author.username}
                      title={p.author.titleManual ?? p.author.titleAuto ?? null}
                      staffRank={p.author.staffRank ?? null}
                      size="sm"
                      href={`/profile/${p.author.username}`}
                    />
                  ) : (
                    <span className="text-night-400">removed</span>
                  )}
                  {i === 0 && (
                    <span className="rounded bg-night-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-night-400">
                      author
                    </span>
                  )}
                </span>
                <span className="text-xs text-night-400">
                  {new Date(p.createdAt).toLocaleString()}
                  {p.editedAt && " (edited)"}
                </span>
              </div>

              <p
                className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${
                  p.deletedAt ? "italic text-night-400" : "text-night-200"
                }`}
              >
                {p.body}
              </p>

              {user && p.author?.id === user.id && !p.deletedAt && (
                <button
                  onClick={() => remove(p.id)}
                  className="mt-2 text-xs text-night-400 hover:text-red-300"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-500/30">
            {error}
          </p>
        )}

        {!thread.locked &&
          (user ? (
            <div className="mt-6">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
                placeholder="Reply"
                className="w-full rounded-lg border border-night-700 bg-night-800 px-3 py-2 text-night-200 placeholder:text-night-400 focus:border-aurora-cyan focus:outline-none"
              />
              <button
                onClick={send}
                disabled={posting || !reply.trim()}
                className="mt-2 rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950 disabled:opacity-50"
              >
                {posting ? "Posting..." : "Reply"}
              </button>
            </div>
          ) : (
            <p className="mt-6 text-sm text-night-400">
              <Link href="/login" className="text-aurora-cyan hover:underline">
                Sign in
              </Link>{" "}
              to reply.
            </p>
          ))}
      </div>
    </main>
  );
}
