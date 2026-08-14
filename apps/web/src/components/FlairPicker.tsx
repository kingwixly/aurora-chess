"use client";

import { useState } from "react";
import { getBadge } from "@aurora/chess";
import api from "../lib/api";
import { useAuthStore } from "../stores/auth";

/**
 * Choose which earned badge to wear beside your name.
 *
 * Flairs and badges are complementary rather than alternatives: you *earn* many
 * badges, all shown on your profile, and *display* one of them everywhere else.
 * You can only pick something you hold — the server enforces that too, since
 * this field is user-settable.
 */
export default function FlairPicker({ earned }: { earned: string[] }) {
  const { user, fetchMe } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const current = user?.activeFlair ?? null;

  async function pick(key: string | null) {
    setSaving(true);
    try {
      await api.patch("/api/v1/auth/account", { activeFlair: key });
      await fetchMe();
    } finally {
      setSaving(false);
    }
  }

  if (earned.length === 0) {
    return (
      <p className="text-sm text-night-400">
        Flairs come from badges. Earn one and you can wear it beside your name.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => pick(null)}
        disabled={saving}
        aria-pressed={current === null}
        className={`rounded-lg px-3 py-2 text-sm ring-1 ring-inset transition-colors ${
          current === null ? "bg-night-800 ring-aurora-cyan" : "ring-night-700 hover:bg-night-800"
        }`}
      >
        None
      </button>
      {earned.map((key) => {
        const badge = getBadge(key);
        if (!badge) return null;
        return (
          <button
            key={key}
            onClick={() => pick(key)}
            disabled={saving}
            aria-pressed={current === key}
            title={badge.description}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ring-1 ring-inset transition-colors ${
              current === key
                ? "bg-night-800 ring-aurora-cyan"
                : "ring-night-700 hover:bg-night-800"
            }`}
          >
            {badge.icon.startsWith("/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={badge.icon} alt="" className="h-4 w-4 object-contain" />
            ) : (
              <span>{badge.icon}</span>
            )}
            {badge.label}
          </button>
        );
      })}
    </div>
  );
}
