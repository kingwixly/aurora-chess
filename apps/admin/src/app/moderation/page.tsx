"use client";

import { useCallback, useEffect, useState } from "react";
import { adminRequest } from "../../lib/adminApi";
import { useToast } from "@aurora/ui";

interface Ban {
  id: string;
  scope: "ACCOUNT" | "IP" | "DEVICE";
  ip: string | null;
  deviceId: string | null;
  reason: string;
  expiresAt: string | null;
  createdAt: string;
  user: { id: string; username: string } | null;
}

interface Appeal {
  id: string;
  body: string;
  source: string;
  discordHandle: string | null;
  publicPostUrl: string | null;
  publicWithdrawnAt: string | null;
  status: string;
  createdAt: string;
  user: { id: string; username: string };
  punishment: { id: string; type: string; reason: string; internalNote: string | null };
}

interface PlayerReport {
  id: string;
  category: string;
  body: string;
  createdAt: string;
  reporter: { username: string };
  target: { id: string; username: string; rating: number };
}

interface CheatReport {
  id: string;
  score: number;
  signals: string[];
  detail: string | null;
  createdAt: string;
  reviewed: boolean;
  verdict: string | null;
  user: { id: string; username: string; rating: number; titleManual: string | null };
}

const INPUT = "rounded bg-gray-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400";

/** Preset durations. Permanent is deliberately last and not the default. */
const DURATIONS = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
  { label: "Permanent", hours: 0 },
];

export default function ModerationPage() {
  // Select the function, not the store. Subscribing to the whole store
  // makes this a new reference on every toast, which turns any dependent
  // callback into an unstable one and any dependent effect into a loop.
  const showToast = useToast((s) => s.show);
  const [bans, setBans] = useState<Ban[]>([]);
  const [reports, setReports] = useState<CheatReport[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [playerReports, setPlayerReports] = useState<PlayerReport[]>([]);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [scope, setScope] = useState<"ACCOUNT" | "IP" | "DEVICE">("ACCOUNT");
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(168);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, r, a, pr] = await Promise.all([
        adminRequest("get", "/api/v1/admin/bans"),
        adminRequest("get", "/api/v1/admin/cheat-reports"),
        adminRequest("get", "/api/v1/admin/appeals"),
        adminRequest("get", "/api/v1/admin/reports"),
      ]);
      setBans(b.data.bans ?? []);
      setReports(r.data.reports ?? []);
      setAppeals(a.data.appeals ?? []);
      setPlayerReports(pr.data.reports ?? []);
    } catch {
      showToast("Could not load moderation data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function issue() {
    if (!target.trim() || !reason.trim()) return;
    setBusy(true);
    try {
      await adminRequest("post", "/api/v1/admin/bans", {
        scope,
        ...(scope === "ACCOUNT" ? { userId: target.trim() } : {}),
        ...(scope === "IP" ? { ip: target.trim() } : {}),
        ...(scope === "DEVICE" ? { deviceId: target.trim() } : {}),
        reason: reason.trim(),
        hours,
      });
      showToast("Ban issued");
      setTarget("");
      setReason("");
      await load();
    } catch (err: unknown) {
      showToast(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Could not issue ban",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  async function lift(id: string) {
    setBusy(true);
    try {
      await adminRequest("post", `/api/v1/admin/bans/${id}/lift`);
      showToast("Ban lifted");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function review(id: string, verdict: string) {
    setBusy(true);
    try {
      await adminRequest("patch", `/api/v1/admin/cheat-reports/${id}`, { verdict });
      showToast("Report reviewed");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function decideAppeal(id: string, status: "ACCEPTED" | "DENIED") {
    const decision = decisions[id]?.trim();
    if (!decision) {
      showToast("Record your reasoning before deciding", "error");
      return;
    }
    setBusy(true);
    try {
      await adminRequest("patch", `/api/v1/admin/appeals/${id}`, { status, decision });
      showToast(status === "ACCEPTED" ? "Appeal accepted, punishment overturned" : "Appeal denied");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function reviewReport(id: string, outcome: string) {
    setBusy(true);
    try {
      await adminRequest("patch", `/api/v1/admin/reports/${id}`, { outcome });
      showToast("Report reviewed");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Moderation</h1>

      {/* Appeals first: someone is waiting on each of these. */}
      <section className="mt-6">
        <h2 className="mb-1 font-semibold">Appeals ({appeals.length})</h2>
        <p className="mb-3 text-xs text-gray-400">
          Oldest first. Accepting overturns the punishment immediately and restores any automatic
          title. Your reasoning is shown to the appellant.
        </p>
        {appeals.length === 0 ? (
          <p className="text-sm text-gray-400">Nobody is waiting.</p>
        ) : (
          <ul className="space-y-3">
            {appeals.map((a) => (
              <li key={a.id} className="rounded-lg bg-gray-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {a.user.username}
                      <span className="ml-2 rounded bg-gray-700 px-1.5 py-0.5 font-mono text-xs">
                        {a.punishment.type}
                      </span>
                      {a.source === "DISCORD" && (
                        <span className="ml-1.5 rounded bg-indigo-600 px-1.5 py-0.5 text-xs">
                          expedited
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Issued for: {a.punishment.reason}
                    </p>
                    {a.punishment.internalNote && (
                      <p className="mt-0.5 text-xs text-amber-300">
                        Staff note: {a.punishment.internalNote}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap rounded bg-gray-900 p-3 text-sm">{a.body}</p>

                <input
                  value={decisions[a.id] ?? ""}
                  onChange={(e) => setDecisions((d) => ({ ...d, [a.id]: e.target.value }))}
                  placeholder="Your reasoning — the appellant reads this"
                  className={`${INPUT} mt-3 w-full`}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => decideAppeal(a.id, "ACCEPTED")}
                    disabled={busy}
                    className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium hover:bg-green-500 disabled:opacity-40"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => decideAppeal(a.id, "DENIED")}
                    disabled={busy}
                    className="rounded bg-gray-700 px-4 py-1.5 text-sm hover:bg-gray-600 disabled:opacity-40"
                  >
                    Deny
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Player reports */}
      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Player reports ({playerReports.length})</h2>
        {playerReports.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing awaiting review.</p>
        ) : (
          <ul className="divide-y divide-gray-700 overflow-hidden rounded-lg bg-gray-800">
            {playerReports.map((r) => (
              <li key={r.id} className="p-4">
                <p className="text-sm">
                  <span className="rounded bg-gray-700 px-1.5 py-0.5 font-mono text-xs">
                    {r.category}
                  </span>{" "}
                  <span className="font-medium">{r.target.username}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    reported by {r.reporter.username}
                  </span>
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-300">{r.body}</p>
                <div className="mt-2 flex gap-2">
                  {["No action", "Warned", "Actioned"].map((o) => (
                    <button
                      key={o}
                      onClick={() => reviewReport(r.id, o)}
                      disabled={busy}
                      className="rounded bg-gray-700 px-3 py-1.5 text-xs hover:bg-gray-600 disabled:opacity-40"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Issue a ban */}
      <section className="mt-6 rounded-lg bg-gray-800 p-5">
        <h2 className="mb-1 font-semibold">Issue a ban</h2>
        <p className="mb-4 text-xs text-gray-400">
          IP bans are blunt — households and schools share an address. Prefer an account or device
          ban unless you are dealing with repeat signups.
        </p>

        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className={INPUT}
          >
            <option value="ACCOUNT">Account ID</option>
            <option value="IP">IP address</option>
            <option value="DEVICE">Device ID</option>
          </select>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={
              scope === "ACCOUNT"
                ? "User ID"
                : scope === "IP"
                  ? "203.0.113.4"
                  : "device fingerprint"
            }
            className={INPUT}
          />
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className={INPUT}
          >
            {DURATIONS.map((d) => (
              <option key={d.label} value={d.hours}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (recorded in the audit log)"
          className={`${INPUT} mt-3 w-full`}
        />

        <button
          onClick={issue}
          disabled={busy || !target.trim() || !reason.trim()}
          className="mt-3 rounded bg-red-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-500 disabled:opacity-40"
        >
          Issue ban
        </button>
      </section>

      {/* Active bans */}
      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Active bans ({bans.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : bans.length === 0 ? (
          <p className="text-sm text-gray-400">No active bans.</p>
        ) : (
          <ul className="divide-y divide-gray-700 overflow-hidden rounded-lg bg-gray-800">
            {bans.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="rounded bg-gray-700 px-1.5 py-0.5 font-mono text-xs">
                      {b.scope}
                    </span>{" "}
                    <span className="font-medium">{b.user?.username ?? b.ip ?? b.deviceId}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {b.reason} &middot;{" "}
                    {b.expiresAt
                      ? `until ${new Date(b.expiresAt).toLocaleDateString()}`
                      : "permanent"}
                  </p>
                </div>
                <button
                  onClick={() => lift(b.id)}
                  disabled={busy}
                  className="shrink-0 rounded bg-gray-700 px-3 py-1.5 text-xs transition-colors hover:bg-gray-600 disabled:opacity-40"
                >
                  Lift
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Cheat reports */}
      <section className="mt-8">
        <h2 className="mb-1 font-semibold">Cheat reports ({reports.length})</h2>
        <p className="mb-3 text-xs text-gray-400">
          These are prompts to look, never verdicts. Accuracy cannot distinguish a cheat from a
          strong player having a good game — check the games before acting.
        </p>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing awaiting review.</p>
        ) : (
          <ul className="divide-y divide-gray-700 overflow-hidden rounded-lg bg-gray-800">
            {reports.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {r.user.titleManual && (
                        <span className="mr-1 font-mono text-xs text-amber-300">
                          {r.user.titleManual}
                        </span>
                      )}
                      {r.user.username}
                      <span className="ml-2 font-mono text-xs text-gray-400">{r.user.rating}</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{r.detail}</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1">
                      {r.signals.map((s) => (
                        <li
                          key={s}
                          className="rounded bg-gray-700 px-1.5 py-0.5 font-mono text-[10px]"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-1 font-mono text-sm font-bold ${
                      r.score >= 70 ? "bg-red-600" : r.score >= 45 ? "bg-yellow-600" : "bg-gray-700"
                    }`}
                  >
                    {r.score}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  {["No action", "Warned", "Banned", "Exempted"].map((v) => (
                    <button
                      key={v}
                      onClick={() => review(r.id, v)}
                      disabled={busy}
                      className="rounded bg-gray-700 px-3 py-1.5 text-xs transition-colors hover:bg-gray-600 disabled:opacity-40"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
