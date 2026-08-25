import Link from "next/link";
import { AuroraBand } from "@aurora/ui";

/** 404. Styled, and offers somewhere to go rather than a dead end. */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-mono text-5xl font-bold text-night-400">404</p>
        <h1 className="font-display text-3xl tracking-tight">Nothing here</h1>
        <p className="max-w-sm text-sm text-night-400">
          That page does not exist. It may have moved, or the link may be wrong.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link
            href="/play"
            className="rounded-lg bg-aurora-cyan px-5 py-2.5 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8]"
          >
            Play
          </Link>
          <Link
            href="/"
            className="rounded-lg px-5 py-2.5 font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
