"use client";

import { useCallback, useEffect, useState } from "react";
import { adminRequest } from "../../lib/adminApi";
import { useToast } from "@aurora/ui";

/**
 * Support tickets.
 *
 * The API for this has existed for a while with nothing rendering it, so
 * tickets could only be worked through curl.
 *
 * One property worth understanding before changing anything here: the reply
 * endpoint takes a ticket id and message text and **nothing else**. No
 * recipient, no sender, no subject — all three come from the stored ticket
 * server-side. That is what stops a compromised staff account from using this
 * as a mail relay, and it is why there is no "compose" form on this page. If
 * you ever find yourself wanting to add a To field, that is the moment to stop.
 */

interface Message {
  id: string;
  fromStaff: boolean;
  body: string;
  emailed: boolean;
  createdAt: string;
}

interface Ticket {
  id: string;
  email: string;
  subject: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string } | null;
  messages: Message[];
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-600/20 text-amber-400",
  ANSWERED: "bg-blue-600/20 text-blue-400",
  CLOSED: "bg-gray-700 text-gray-400",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const showToast = useToast((s) => s.show);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminRequest("get", `/api/v1/admin/support?status=${filter}`);
      setTickets(res.data.tickets ?? []);
    } catch {
      showToast("Could not load tickets", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const open = tickets.find((t) => t.id === selected) ?? null;

  async function send(close: boolean) {
    if (!open || !reply.trim()) return;
    setSending(true);
    try {
      await adminRequest("post", `/api/v1/admin/support/${open.id}/reply`, {
        body: reply.trim(),
        close,
      });
      showToast(close ? "Replied and closed" : "Reply sent");
      setReply("");
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not send the reply";
      showToast(msg, "error");
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status: "OPEN" | "CLOSED") {
    if (!open) return;
    try {
      await adminRequest("patch", `/api/v1/admin/support/${open.id}`, { status });
      await load();
    } catch {
      showToast("Could not change the status", "error");
    }
  }

  return (
    <main className="p-4 lg:p-8">
      <h1 className="text-xl font-bold">Support</h1>
      <p className="mt-1 text-sm text-gray-400">
        Replies are emailed from support@aurorachess.org to the address on the ticket.
      </p>

      <div className="mt-4 flex gap-1">
        {(["open", "closed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setSelected(null);
            }}
            className={`rounded px-3 py-1.5 text-sm capitalize transition-colors ${
              filter === f ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {loading && <p className="text-sm text-gray-400">Loading...</p>}
          {!loading && tickets.length === 0 && (
            <p className="rounded bg-gray-800 p-4 text-sm text-gray-400">
              No {filter === "all" ? "" : filter} tickets.
            </p>
          )}
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`w-full rounded p-3 text-left transition-colors ${
                selected === t.id ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{t.subject}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[t.status]}`}
                >
                  {t.status.toLowerCase()}
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs text-gray-400">
                {t.user ? t.user.username : t.email}
                {" \u00B7 "}
                {new Date(t.updatedAt).toLocaleDateString()}
                {" \u00B7 "}
                {t.messages.length} message{t.messages.length === 1 ? "" : "s"}
              </div>
            </button>
          ))}
        </div>

        <div>
          {!open ? (
            <p className="rounded bg-gray-800 p-6 text-sm text-gray-400">
              Select a ticket to read it.
            </p>
          ) : (
            <div className="rounded bg-gray-800 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-700 pb-3">
                <div>
                  <h2 className="font-medium">{open.subject}</h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {open.user ? `${open.user.username} · ` : ""}
                    {open.email}
                  </p>
                </div>
                <button
                  onClick={() => setStatus(open.status === "CLOSED" ? "OPEN" : "CLOSED")}
                  className="rounded bg-gray-700 px-3 py-1.5 text-xs hover:bg-gray-600"
                >
                  {open.status === "CLOSED" ? "Reopen" : "Close"}
                </button>
              </div>

              <ul className="mt-3 max-h-[45vh] space-y-3 overflow-y-auto">
                {open.messages.map((m) => (
                  <li
                    key={m.id}
                    className={`rounded p-3 text-sm ${
                      m.fromStaff ? "ml-6 bg-blue-600/10" : "mr-6 bg-gray-700"
                    }`}
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs text-gray-400">
                      <span>{m.fromStaff ? "Staff" : "Them"}</span>
                      <span>
                        {new Date(m.createdAt).toLocaleString()}
                        {/* Whether it actually left the building. A reply that
                            was saved but not emailed looks identical otherwise,
                            and someone would keep waiting for an answer that
                            never arrived. */}
                        {m.fromStaff && (m.emailed ? " \u00B7 emailed" : " \u00B7 not emailed")}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </li>
                ))}
              </ul>

              {open.status !== "CLOSED" && (
                <div className="mt-4 border-t border-gray-700 pt-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={5}
                    placeholder="Your reply. This is emailed to the address on the ticket."
                    className="w-full rounded bg-gray-900 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => send(false)}
                      disabled={sending || !reply.trim()}
                      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
                    >
                      {sending ? "Sending..." : "Send reply"}
                    </button>
                    <button
                      onClick={() => send(true)}
                      disabled={sending || !reply.trim()}
                      className="rounded bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600 disabled:opacity-50"
                    >
                      Send and close
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Goes to {open.email}. The recipient comes from the ticket and cannot be changed
                    here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
