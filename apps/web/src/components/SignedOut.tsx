"use client";

import Link from "next/link";
import { AuroraBand } from "@aurora/ui";

/**
 * What a signed-out visitor sees on a page that needs an account.
 *
 * Guarded pages used to `return null` while a redirect effect ran, which
 * renders a literally blank screen — and if the redirect never fires, or the
 * session check fails outright, the blank screen is *all* you get, with no way
 * out. This always gives a way forward.
 */
export default function SignedOut({
  error,
}: {
  /** Set when the session check failed, as opposed to simply being logged out. */
  error?: string | null;
}) {
  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          {error ? "Something went wrong" : "You are signed out"}
        </h1>
        <p className="mt-2 text-night-400">
          {error
            ? "We could not load your session. This is usually temporary."
            : "Sign in to see your games, ratings and puzzles."}
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300 ring-1 ring-inset ring-red-500/30">
            {error}
          </p>
        )}

        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-aurora-cyan px-6 py-3 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8]"
          >
            Log in
          </Link>
          <Link
            href="/"
            className="rounded-lg px-6 py-3 font-semibold ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
