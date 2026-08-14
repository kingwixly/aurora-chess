"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "../lib/api";
import { useAuthStore } from "../stores/auth";

/**
 * Persistent notice when an action is live on the account.
 *
 * Someone who has been actioned should never have to work out why something
 * stopped working. This appears on every page and links straight to the
 * standing page, which explains what happened and whether it can be contested.
 */
export default function StandingBanner() {
  const { user } = useAuthStore();
  const [active, setActive] = useState<{ type: string; expiresAt: string | null } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .get("/api/v1/standing")
      .then(({ data }) => {
        if (cancelled) return;
        const live = (data.punishments ?? []).find((p: { active: boolean }) => p.active);
        setActive(live ? { type: live.type, expiresAt: live.expiresAt } : null);
      })
      .catch(() => {
        // Never let this break a page it is only decorating.
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!active || dismissed) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-2.5 text-sm">
        <span className="font-medium text-amber-200">
          There is an active {active.type.toLowerCase()} on your account
          {active.expiresAt && ` until ${new Date(active.expiresAt).toLocaleDateString()}`}.
        </span>
        <Link
          href="/standing"
          className="font-medium text-aurora-cyan underline-offset-2 hover:underline"
        >
          See your standing
        </Link>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          // Dismissable for this page view only — it returns on navigation,
          // because a live restriction should not be easy to forget.
          className="ml-auto text-night-400 transition-colors hover:text-white"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
