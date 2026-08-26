"use client";

import Link from "next/link";
import { AuroraBand } from "@aurora/ui";
import { ENGINES } from "@aurora/chess";

interface EventEntry {
  id: string;
  name: string;
  blurb: string;
  detail: string;
  cta: { label: string; href: string } | null;
  status: "open" | "soon";
}

/**
 * Events.
 *
 * Deliberately honest about what is running: an events page listing four
 * things that do not exist yet is worse than one listing the two that do. Each
 * entry says plainly whether you can play it now.
 */
const EVENTS: EventEntry[] = [
  {
    id: "worstfish",
    name: "Beat WorstFish",
    blurb: "Harder than it sounds.",
    detail:
      "WorstFish finds the worst legal move in every position - it is not a weakened engine but an inverted one. It will hang everything, refuse every capture it can avoid, and walk its king toward you. Winning is easy. Winning quickly is not, and losing is a genuine achievement.",
    cta: { label: "Play WorstFish", href: "/play/bot?bot=worstfish" },
    status: "open",
  },
  {
    id: "drawfish",
    name: "Draw against DrawFish",
    blurb: "Sounds easy. It is not.",
    detail:
      "DrawFish plays whichever move leaves the position closest to dead level. It will take an immediate draw and refuse a winning one, because winning is further from zero than not winning. Build an advantage and it slides toward defeat as slowly as arithmetic allows - so the game becomes about forcing a result it is actively trying to avoid.",
    cta: { label: "Play DrawFish", href: "/play/bot?bot=drawfish" },
    status: "open",
  },
  {
    id: "ladder",
    name: "The bot ladder",
    blurb: "Beat every bot, weakest to strongest.",
    detail:
      "Thirty-one bots from 200 to 3200. Beat one to unlock the next. Most people stall somewhere around their own rating plus two hundred, which is exactly the point where a game stops being comfortable and starts teaching you something.",
    cta: { label: "Start at the bottom", href: "/play/bot" },
    status: "open",
  },
  {
    id: "puzzle-streak",
    name: "Puzzle streak",
    blurb: "How far can you get without a mistake?",
    detail:
      "Puzzles in rising difficulty until you miss one. Every puzzle on Aurora is engine-verified and hand-explained, so a streak that ends teaches you something rather than just stopping.",
    cta: { label: "Start solving", href: "/puzzles" },
    status: "open",
  },
];

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/play" className="text-sm text-night-400 transition-colors hover:text-white">
          &larr; Back to play
        </Link>

        <h1 className="mt-4 font-display text-3xl tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-night-400">
          Things to do that are not just another rated game.
        </p>

        <ul className="mt-8 space-y-4">
          {EVENTS.map((e) => (
            <li key={e.id} className="rounded-xl bg-night-900 p-5 ring-1 ring-inset ring-night-700">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl">{e.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    e.status === "open"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-night-800 text-night-400"
                  }`}
                >
                  {e.status === "open" ? "Open now" : "Coming soon"}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-aurora-cyan">{e.blurb}</p>
              <p className="mt-2 text-sm leading-relaxed text-night-300">{e.detail}</p>
              {e.cta && (
                <Link
                  href={e.cta.href}
                  className="mt-4 inline-block rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8]"
                >
                  {e.cta.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <section className="mt-10 rounded-xl bg-night-900 p-5 ring-1 ring-inset ring-night-700">
          <h2 className="font-display text-lg">Engines you can choose</h2>
          <p className="mt-1 text-sm text-night-400">
            Analysis runs in your browser, which is why it is unlimited and free. It also means you
            pay the download, so you get to pick.
          </p>
          <ul className="mt-3 space-y-2">
            {Object.values(ENGINES).map((eng) => (
              <li key={eng.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">{eng.name}</span>
                  <span className="ml-2 text-xs text-night-400">
                    {eng.canAnalyse ? "play and analyse" : "play only"}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-night-400">{eng.sizeMb}MB</span>
              </li>
            ))}
          </ul>
          <Link
            href="/settings"
            className="mt-3 inline-block text-sm font-medium text-aurora-cyan hover:underline"
          >
            Choose in settings
          </Link>
        </section>
      </div>
    </main>
  );
}
