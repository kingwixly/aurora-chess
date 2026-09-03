"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  AUTO_TITLES,
  MANUAL_UNOFFICIAL_TITLES,
  TITLE_LABELS,
  TITLE_CRITERIA_TEXT,
} from "@aurora/chess";
import { AuroraBand, PlayerName } from "@aurora/ui";
import { useAuthStore } from "../stores/auth";

/**
 * The public landing page.
 *
 * Its single job is to move a visitor into a game or a signup. The hero leads
 * with the one thing that distinguishes Aurora from the two large sites --
 * titles earned on the board rather than through a federation -- because that
 * is the reason a club would choose to play here rather than there.
 *
 * Signed-in visitors never see it; they are sent straight to the dashboard.
 */
export default function Home() {
  const router = useRouter();
  const { user, isLoading, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Image src="/logo-mark.png" alt="Aurora Chess" width={36} height={36} priority />
          <span className="font-display text-lg font-semibold tracking-tight">Aurora Chess</span>
        </div>
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link
                href="/history"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-night-400 transition-colors hover:text-white sm:inline-block"
              >
                Games
              </Link>
              <Link
                href="/stats"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-night-400 transition-colors hover:text-white sm:inline-block"
              >
                Stats
              </Link>
              <Link
                href={`/profile/${user.username}`}
                className="rounded-lg px-3 py-2 transition-colors hover:bg-night-800"
              >
                <PlayerName
                  username={user.username}
                  title={user.title}
                  fideVerified={user.fideVerified}
                  modShield={user.modShield}
                  flair={user.activeFlair}
                  rating={user.rating}
                  size="sm"
                />
              </Link>
              {/* The admin link existed on /play but not here, so an admin
                  landing on the homepage had no route to the panel at all. */}
              {user.role === "ADMIN" && process.env.NEXT_PUBLIC_ADMIN_URL && (
                <a
                  href={process.env.NEXT_PUBLIC_ADMIN_URL}
                  className="rounded-lg px-3 py-2 text-sm text-night-400 transition-colors hover:text-white"
                >
                  Admin
                </a>
              )}
              <button
                onClick={async () => {
                  await logout();
                  router.refresh();
                }}
                className="rounded-lg px-3 py-2 text-sm text-night-400 transition-colors hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-night-400 transition-colors hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-night-900 transition-colors hover:bg-aurora-cyan"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-aurora-cyan">
              {/* Small and plain. A large display-font tagline over a hero is
                  the single most generated-looking thing a site can do, and it
                  was the first thing anyone saw. */}
              {user ? user.username : "Free chess, no accounts required to start"}
            </p>
            {/* Down from 5xl/6xl, and the gradient sits on one short phrase
                rather than a whole line. Enormous display type over a gradient
                is the house style of every generated landing page, and it was
                the first thing anyone saw here. */}
            <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
              Titles you earn{" "}
              <span className="bg-aurora bg-clip-text text-transparent">over the board</span>
            </h1>
            <p className="mt-4 max-w-lg leading-relaxed text-night-400">
              Aurora recognises every FIDE and national title. It also awards its own, earned by
              playing rather than by paperwork. Reach 2200 here and you are an Aurora Master,
              whether or not you have ever entered a rated event.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <>
                  <Link
                    href="/play"
                    className="rounded-lg bg-aurora-cyan px-6 py-3 font-semibold text-night-950 transition-transform hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
                  >
                    Play
                  </Link>
                  <Link
                    href="/play/queue"
                    className="rounded-lg px-6 py-3 font-semibold text-white ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
                  >
                    Quick play
                    <span className="ml-2 text-sm font-normal text-night-400">random opponent</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="rounded-lg bg-aurora-cyan px-6 py-3 font-semibold text-night-950 transition-transform hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
                  >
                    Start playing
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-lg px-6 py-3 font-semibold text-white ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
                  >
                    I have an account
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-sm lg:block">
            <div
              className="absolute -inset-8 rounded-full bg-aurora-soft blur-3xl"
              aria-hidden="true"
            />
            <Image src="/logo-mark.png" alt="" width={420} height={393} className="relative" />
          </div>
        </div>
      </section>

      <AuroraBand className="opacity-30" />

      <section className="mx-auto max-w-6xl px-6 py-20">
        {/* Counted from the data rather than typed, and counting TILES rather
            than title codes - a "way to earn" is a route, and the staff-granted
            titles are one route between them. A hand-written number said "Ten"
            while the grid showed eight. */}
        <h2 className="font-display text-3xl tracking-tight">
          {AUTO_TITLES.length + 2} ways to earn a title
        </h2>
        <p className="mt-3 max-w-2xl text-night-400">
          Aurora titles are unofficial and site-local. {AUTO_TITLES.length} are earned on the board
          and awarded automatically, {MANUAL_UNOFFICIAL_TITLES.length} are granted by staff, and
          verified federation titles carry across. They say nothing about FIDE and are not meant to
          - they say you did something specific here, and once earned they are permanent.
        </p>

        <ul className="mt-10 grid gap-px overflow-hidden rounded-xl bg-night-700 sm:grid-cols-2 lg:grid-cols-3">
          {AUTO_TITLES.map((t) => (
            <li key={t} className="bg-night-900 p-6">
              <span className="font-mono text-sm font-bold text-[#b6a6ff]">{t}</span>
              <h3 className="mt-2 font-display text-xl">{TITLE_LABELS[t]}</h3>
              <p className="mt-2 text-sm leading-relaxed text-night-400">
                {TITLE_CRITERIA_TEXT[t]}
              </p>
            </li>
          ))}
          {/* Staff-granted titles share one tile: they are one route, not three
              separate achievements, and three near-identical cards would imply
              otherwise. */}
          <li className="bg-night-900 p-6">
            <span className="font-mono text-sm font-bold text-[#b6a6ff]">
              {MANUAL_UNOFFICIAL_TITLES.join(" \u00B7 ")}
            </span>
            <h3 className="mt-2 font-display text-xl">Granted by staff</h3>
            <p className="mt-2 text-sm leading-relaxed text-night-400">
              {MANUAL_UNOFFICIAL_TITLES.map((t) => TITLE_LABELS[t]).join(", ")}. Awarded for
              contributions rather than rating, and never handed out quietly.
            </p>
          </li>

          <li className="bg-night-900 p-6">
            <span className="font-mono text-sm font-bold text-amber-300">
              GM &middot; IM &middot; FM
            </span>
            <h3 className="mt-2 font-display text-xl">Federation titles</h3>
            <p className="mt-2 text-sm leading-relaxed text-night-400">
              Hold a FIDE or national title? Send staff your ID and it appears on your profile,
              verified.
            </p>
          </li>
        </ul>
      </section>

      <AuroraBand className="opacity-30" />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <h3 className="font-display text-xl">Play any time control</h3>
            <p className="mt-2 text-sm leading-relaxed text-night-400">
              Bullet through classical, each with its own rating. Win at blitz and it counts as
              blitz.
            </p>
          </div>
          <div>
            <h3 className="font-display text-xl">Analyse every game</h3>
            <p className="mt-2 text-sm leading-relaxed text-night-400">
              Stockfish runs in your browser. Move classification, accuracy, and the line you should
              have played.
            </p>
          </div>
          <div>
            <h3 className="font-display text-xl">Bring your club</h3>
            <p className="mt-2 text-sm leading-relaxed text-night-400">
              Invite-only or open, your call. Arbiters and club officials get verified badges.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-night-700">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-night-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Aurora Chess</span>
          <div className="flex gap-6">
            <Link href="/legal/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            {/* Public and prominent on purpose: how moderation works is the
                thing prospective players most want to know and the thing the
                big sites are least willing to say. */}
            <Link href="/fair-play" className="transition-colors hover:text-white">
              Fair play
            </Link>
            <Link href="/leaderboard" className="transition-colors hover:text-white">
              Leaderboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
