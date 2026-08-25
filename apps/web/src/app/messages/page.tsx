"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuroraBand, PlayerName } from "@aurora/ui";
import api from "../../lib/api";
import { useAuthStore } from "../../stores/auth";
import SignedOut from "../../components/SignedOut";
import ReportDialog from "../../components/ReportDialog";

interface Person {
  id: string;
  username: string;
  title?: string | null;
  fideVerified?: boolean;
  staffRank?: string | null;
  modShield?: boolean;
  activeFlair?: string | null;
}

interface Conversation {
  id: string;
  unread: number;
  muted: boolean;
  lastMessageAt: string;
  with: Person | null;
  preview: { body: string; createdAt: string; mine: boolean } | null;
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  author: Person;
}

function MessagesInner() {
  const params = useSearchParams();
  const { user, isLoading, fetchMe, sessionError } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(params.get("with"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ username: string; messageId?: string } | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/messages");
      setConversations(data.conversations ?? []);
    } catch {
      // A failed list must not blank the page.
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const { data } = await api.get(`/api/v1/messages/${id}`);
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (user) loadConversations();
  }, [user, loadConversations]);

  useEffect(() => {
    if (active) loadMessages(active);
  }, [active, loadMessages]);

  // Poll rather than push. Messages are not latency-critical, and a socket
  // channel would need its own auth, reconnection and backpressure handling for
  // a feature that works fine at a five-second beat.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      loadConversations();
      if (active) loadMessages(active);
    }, 5000);
    return () => clearInterval(id);
  }, [user, active, loadConversations, loadMessages]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const { data } = await api.post("/api/v1/messages", {
        conversationId: active ?? undefined,
        to: active ? undefined : (params.get("to") ?? undefined),
        body,
      });
      setDraft("");
      setMessages((m) => [...m, data.message]);
      if (!active) setActive(data.message.conversationId);
      loadConversations();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Could not send"
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

  const current = conversations.find((c) => c.id === active);

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/friends" className="text-sm text-night-400 transition-colors hover:text-white">
          &larr; Friends
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-night-400">You can message people you are friends with.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
          {/* Conversation list */}
          <aside className="overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
            {conversations.length === 0 ? (
              <p className="p-4 text-sm text-night-400">
                No conversations yet. Open a friend&apos;s profile and say hello.
              </p>
            ) : (
              <ul className="divide-y divide-night-700">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setActive(c.id)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        active === c.id ? "bg-night-800" : "hover:bg-night-800"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        {c.with && (
                          <PlayerName
                            username={c.with.username}
                            title={c.with.title as never}
                            fideVerified={c.with.fideVerified}
                            staffRank={c.with.staffRank}
                            modShield={c.with.modShield}
                            flair={c.with.activeFlair}
                            size="sm"
                          />
                        )}
                        {c.unread > 0 && (
                          <span className="shrink-0 rounded-full bg-aurora-cyan px-1.5 py-0.5 font-mono text-[10px] font-bold text-night-950">
                            {c.unread}
                          </span>
                        )}
                      </span>
                      {c.preview && (
                        <span className="mt-0.5 block truncate text-xs text-night-400">
                          {c.preview.mine && "You: "}
                          {c.preview.body}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Thread */}
          <section className="flex min-h-[60vh] flex-col rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
            {!active ? (
              <p className="m-auto text-sm text-night-400">Pick a conversation.</p>
            ) : (
              <>
                {current?.with && (
                  <header className="border-b border-night-700 px-5 py-3">
                    <Link href={`/profile/${current.with.username}`}>
                      <PlayerName
                        username={current.with.username}
                        title={current.with.title as never}
                        fideVerified={current.with.fideVerified}
                        staffRank={current.with.staffRank}
                        modShield={current.with.modShield}
                        flair={current.with.activeFlair}
                      />
                    </Link>
                    <button
                      onClick={() => setReporting({ username: current.with!.username })}
                      className="mt-1 text-xs text-night-400 transition-colors hover:text-red-300"
                    >
                      Report
                    </button>
                  </header>
                )}

                <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
                  {messages.map((m) => {
                    const mine = m.author.id === user.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-xl px-3.5 py-2 text-sm ${
                            mine ? "bg-aurora-cyan text-night-950" : "bg-night-800 text-night-300"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p
                            className={`mt-0.5 text-[10px] ${
                              mine ? "text-night-950/60" : "text-night-400"
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottom} />
                </div>

                {error && <p className="px-5 pb-2 text-xs text-red-300">{error}</p>}

                <div className="flex gap-2 border-t border-night-700 p-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    maxLength={2000}
                    placeholder="Write a message"
                    className="flex-1 rounded-lg border border-night-700 bg-night-800 px-3.5 py-2.5 text-sm outline-none focus:border-aurora-cyan"
                  />
                  <button
                    onClick={send}
                    disabled={sending || !draft.trim()}
                    className="rounded-lg bg-aurora-cyan px-5 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8] disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {reporting && (
        <ReportDialog
          targetUsername={reporting.username}
          messageId={reporting.messageId}
          defaultCategory="chat"
          onClose={() => setReporting(null)}
        />
      )}
    </main>
  );
}

/** `useSearchParams` needs a boundary or the route cannot be prerendered. */
export default function MessagesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-night-950" />}>
      <MessagesInner />
    </Suspense>
  );
}
