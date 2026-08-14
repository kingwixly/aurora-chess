"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../lib/api";
import { useAuthStore } from "../../stores/auth";
import { useToast } from "@aurora/ui";

interface InviteItem {
  id: string;
  code: string;
  used: boolean;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}

interface InviteStats {
  totalCreated: number;
  totalUsed: number;
  maxAllowed: number;
  remaining: number;
  canCreate: boolean;
  usedTowardNext: number;
  neededForNext: number;
}

export default function InvitesPage() {
  const router = useRouter();
  const { user, isLoading, fetchMe } = useAuthStore();
  const toast = useToast();
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) fetchMe();
  }, [user, fetchMe]);
  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, statsRes] = await Promise.all([
        api.get("/api/v1/invites"),
        api.get("/api/v1/invites/stats"),
      ]);
      setInvites(invRes.data.invites);
      setStats(statsRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  async function generate() {
    setGenerating(true);
    try {
      const { data } = await api.post("/api/v1/invites");
      toast.show(`Invite created: ${data.code.slice(0, 8)}...`);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to generate invite";
      toast.show(msg, "error");
    } finally {
      setGenerating(false);
    }
  }

  async function copyLink(code: string) {
    const siteUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost";
    const link = `${siteUrl}/register?invite=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.show("Invite link copied");
    } catch {
      toast.show("Failed to copy", "error");
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.show("Code copied");
    } catch {
      toast.show("Failed to copy", "error");
    }
  }

  if (isLoading || !user) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }

  const usedPercent =
    stats && stats.totalCreated > 0 ? Math.round((stats.totalUsed / stats.totalCreated) * 100) : 0;

  return (
    <main className="flex flex-col items-center min-h-screen p-4 pt-12">
      <div className="max-w-lg w-full space-y-6">
        <h1 className="text-2xl font-bold text-center font-display">My Invites</h1>

        {/* Stats */}
        {stats && (
          <div className="bg-night-900 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center mb-3">
              <div>
                <p className="text-2xl font-bold font-display">{stats.totalCreated}</p>
                <p className="text-xs text-night-400">Created</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400 font-display">
                  {stats.totalUsed}
                </p>
                <p className="text-xs text-night-400">Used</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-aurora-cyan font-display">
                  {stats.remaining}
                </p>
                <p className="text-xs text-night-400">Remaining</p>
              </div>
            </div>
            {/* Progress toward next batch */}
            <div className="mt-2">
              <div className="flex justify-between text-xs text-night-400 mb-1">
                <span>
                  {stats.usedTowardNext}/{stats.neededForNext} used toward next batch
                </span>
                <span>{usedPercent}%</span>
              </div>
              <div className="w-full bg-night-800 rounded-full h-2">
                <div
                  className="bg-aurora-cyan h-2 rounded-full transition-all"
                  style={{
                    width: `${stats.neededForNext > 0 ? Math.min(100, (stats.usedTowardNext / stats.neededForNext) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={generating || !!(stats && !stats.canCreate)}
          className="w-full py-2 bg-aurora-cyan hover:bg-[#3ad2e8] disabled:opacity-50 rounded font-medium transition-colors"
        >
          {generating
            ? "Generating..."
            : stats && !stats.canCreate
              ? "Invite limit reached — get more invites used"
              : "Generate New Invite"}
        </button>

        {/* Invite list */}
        {loading ? (
          <p className="text-night-400 text-center">Loading...</p>
        ) : invites.length === 0 ? (
          <p className="text-night-500 text-center py-8">No invites yet. Generate one above!</p>
        ) : (
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="bg-night-900 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-night-300 font-mono truncate">
                      {inv.code.slice(0, 12)}...
                    </code>
                    {inv.used ? (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                        Used
                      </span>
                    ) : (
                      <span className="text-xs bg-night-800 text-night-400 px-2 py-0.5 rounded">
                        Unused
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-night-500 mt-1">
                    {inv.used
                      ? `Used by ${inv.usedBy} on ${new Date(inv.usedAt!).toLocaleDateString()}`
                      : `Created ${new Date(inv.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
                {!inv.used && (
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => copyLink(inv.code)}
                      className="px-2 py-1 bg-aurora-cyan/30 hover:bg-aurora-cyan text-aurora-cyan hover: text-xs rounded transition-colors text-night-950"
                    >
                      Link
                    </button>
                    <button
                      onClick={() => copyCode(inv.code)}
                      className="px-2 py-1 bg-night-800 hover:bg-night-700 text-xs rounded transition-colors"
                    >
                      Code
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link href="/play" className="text-night-400 hover:text-white text-sm">
            &larr; Back to Play
          </Link>
        </div>
      </div>
    </main>
  );
}
