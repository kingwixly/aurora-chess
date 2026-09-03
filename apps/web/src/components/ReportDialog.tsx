"use client";

import { useState } from "react";
import api from "../lib/api";

const CATEGORIES = [
  { key: "cheating", label: "Cheating", hint: "Engine use or outside assistance" },
  { key: "chat", label: "Chat or messages", hint: "Abuse, harassment, spam" },
  { key: "username", label: "Username", hint: "Offensive or impersonating" },
  { key: "other", label: "Something else", hint: "" },
] as const;

/**
 * Report a player.
 *
 * Deliberately asks for a sentence rather than accepting a bare category. A
 * report with no detail cannot be acted on, and prompting for one filters the
 * reflex reports people file after losing.
 */
export default function ReportDialog({
  targetUsername,
  gameId,
  messageId,
  defaultCategory,
  onClose,
}: {
  targetUsername: string;
  gameId?: string;
  messageId?: string;
  defaultCategory?: string;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(defaultCategory ?? "cheating");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setSending(true);
    setError(null);
    try {
      await api.post("/api/v1/reports", {
        targetUsername,
        category,
        body: body.trim(),
        gameId,
        messageId,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Report ${targetUsername}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-night-900 p-6 ring-1 ring-inset ring-night-700"
      >
        {done ? (
          <>
            <h2 className="font-display text-2xl">Report submitted</h2>
            <p className="mt-2 text-sm text-night-400">
              A moderator will look at it. You will not be told the outcome - what happens to
              another account is between them and us - but the report is read.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-lg bg-aurora-cyan py-2.5 font-semibold text-night-950"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl">Report {targetUsername}</h2>

            <div className="mt-4 space-y-2">
              {CATEGORIES.map((c) => (
                <label
                  key={c.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-1 ring-inset transition-colors ${
                    category === c.key
                      ? "bg-night-800 ring-aurora-cyan"
                      : "ring-night-700 hover:bg-night-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    checked={category === c.key}
                    onChange={() => setCategory(c.key)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{c.label}</span>
                    {c.hint && (
                      <span className="mt-0.5 block text-xs text-night-400">{c.hint}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">What happened</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="A sentence or two is enough."
                className="w-full rounded-lg border border-night-700 bg-night-800 px-3.5 py-2.5 text-sm outline-none focus:border-aurora-cyan"
              />
            </label>

            {error && (
              <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-500/30">
                {error}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg py-2.5 font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={sending || body.trim().length < 10}
                title={body.trim().length < 10 ? "Tell us what happened first" : undefined}
                className="flex-1 rounded-lg bg-aurora-cyan py-2.5 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8] disabled:opacity-40"
              >
                {sending ? "Sending..." : "Submit"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
