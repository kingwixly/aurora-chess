"use client";

import { useEffect } from "react";
import Link from "next/link";

export interface TimeControlChoice {
  label: string;
  name: string;
  minutes: number;
  increment: number;
}

/**
 * What happens after you tap a time control.
 *
 * Tapping a tile used to drop you straight into a friend challenge, which is
 * the less common intent — most people picking "3+0" want a game now, against
 * whoever is available. This asks, and puts the live waiting count on the
 * random option so the choice is informed rather than a gamble.
 */
export default function TimeControlPanel({
  choice,
  waiting,
  onClose,
}: {
  choice: TimeControlChoice | null;
  waiting: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!choice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choice, onClose]);

  if (!choice) return null;

  const query = `minutes=${choice.minutes}&increment=${choice.increment}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Play ${choice.label}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-night-900 ring-1 ring-inset ring-night-700"
      >
        <div className="h-1 w-full bg-aurora" />

        <div className="p-6">
          <div className="text-center">
            <p className="font-mono text-4xl font-bold tracking-tight">{choice.label}</p>
            <p className="mt-1 text-sm uppercase tracking-wider text-night-400">{choice.name}</p>
          </div>

          <div className="mt-6 space-y-2">
            <Link
              href={`/play/queue?${query}`}
              className="block w-full rounded-lg bg-aurora-cyan px-5 py-3.5 text-center font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8]"
            >
              Play a random opponent
              {waiting > 0 && (
                <span className="mt-0.5 block text-sm font-normal opacity-75">
                  {waiting} {waiting === 1 ? "player" : "players"} waiting
                </span>
              )}
            </Link>

            <Link
              href={`/play/friend?${query}`}
              className="block w-full rounded-lg px-5 py-3 text-center font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
            >
              Challenge a friend
            </Link>

            <button
              onClick={onClose}
              className="w-full rounded-lg py-2.5 text-sm text-night-400 transition-colors hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
