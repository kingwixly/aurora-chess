"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../../lib/api";
import { AuroraBand } from "@aurora/ui";

const CATEGORIES = [
  { id: "general", label: "General", hint: "Anything about chess or the site." },
  { id: "help", label: "Help", hint: "Something is not working, or you are stuck." },
  { id: "feedback", label: "Feedback", hint: "Ideas and complaints about Aurora." },
  { id: "off-topic", label: "Off topic", hint: "Everything else." },
];

export default function NewThreadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  async function submit() {
    setError("");
    setPosting(true);
    try {
      const { data } = await api.post("/api/v1/forum/threads", { title, body, category });
      router.push(`/forum/${data.thread.id}`);
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { error?: string } } })?.response;
      // A capability block is not a validation error, and saying "try again"
      // to someone who has been silenced is useless.
      setError(
        res?.status === 403
          ? "Your account cannot post at the moment. Check your standing page."
          : res?.data?.error || "Could not post the thread."
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/forum" className="text-sm text-night-400 hover:text-white">
          &larr; Forum
        </Link>
        <h1 className="mt-4 font-display text-3xl tracking-tight">New thread</h1>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-500/30">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="t" className="mb-1.5 block text-sm font-medium">
              Title
            </label>
            <input
              id="t"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              className="w-full rounded-lg border border-night-700 bg-night-800 px-3 py-2 text-night-200 focus:border-aurora-cyan focus:outline-none"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium">Board</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`rounded-lg p-3 text-left transition-colors ${
                    category === c.id
                      ? "bg-aurora-cyan text-night-950"
                      : "bg-night-800 text-night-200 hover:bg-night-700"
                  }`}
                >
                  <span className="block text-sm font-medium">{c.label}</span>
                  <span
                    /* Stated with its background so the pairing is checkable.
                       A translucent dark on solid cyan reads fine, but the
                       checker cannot know that from the class alone. */
                    className={`block text-xs ${
                      category === c.id ? "bg-aurora-cyan text-night-900" : "text-night-400"
                    }`}
                  >
                    {c.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="b" className="mb-1.5 block text-sm font-medium">
              Post
            </label>
            <textarea
              id="b"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              maxLength={20000}
              className="w-full rounded-lg border border-night-700 bg-night-800 px-3 py-2 text-night-200 focus:border-aurora-cyan focus:outline-none"
            />
          </div>

          <button
            onClick={submit}
            disabled={posting || title.trim().length < 3 || !body.trim()}
            className="w-full rounded-xl bg-aurora-cyan py-3 font-semibold text-night-950 disabled:opacity-50"
          >
            {posting ? "Posting..." : "Post thread"}
          </button>
        </div>
      </div>
    </main>
  );
}
