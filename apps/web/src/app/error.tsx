"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary.
 *
 * Without this a client-side crash renders Next's unstyled default, which looks
 * like the site is broken rather than that one page failed — and gives no way
 * back. Reset is offered first because most of these are transient.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged so it reaches the browser console for a bug report, since there is
    // no error reporting service wired up.
    console.error("Route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-night-950 px-6 text-center">
      <h1 className="font-display text-3xl tracking-tight">Something broke</h1>
      <p className="max-w-sm text-sm text-night-400">
        This page hit an error. It is usually temporary — trying again often works.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-night-400">Reference: {error.digest}</p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-aurora-cyan px-5 py-2.5 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8]"
        >
          Try again
        </button>
        <Link
          href="/play"
          className="rounded-lg px-5 py-2.5 font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
        >
          Back to play
        </Link>
      </div>
    </main>
  );
}
