"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStandalone } from "../lib/useStandalone";

/**
 * A bottom tab bar, shown only when installed as an app.
 *
 * In a browser tab this would be redundant chrome competing with the browser's
 * own navigation. Launched from the home screen there is no back button and no
 * address bar, so without something like this the app is a dead end - which is
 * the single most common way an installed web app feels broken.
 *
 * Sits above the home indicator via safe-area padding, and stays fixed so it
 * survives scrolling.
 */

const TABS = [
  { href: "/play", label: "Play", icon: PlayIcon },
  { href: "/puzzles", label: "Puzzles", icon: PuzzleIcon },
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/profile", label: "You", icon: PersonIcon },
];

export default function AppTabBar() {
  const standalone = useStandalone();
  const pathname = usePathname();

  if (!standalone) return null;
  // The board wants the whole screen; a tab bar over it costs a rank of squares.
  if (pathname.startsWith("/game/") || pathname.includes("/play/bot/")) return null;
  if (pathname.startsWith("/play/otb")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-night-700 bg-night-900/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                  active ? "text-aurora-cyan" : "text-night-400"
                }`}
              >
                <Icon active={active} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* Icons are inline SVG rather than an icon font: four glyphs do not justify a
   dependency, and these need to change colour with the active state. */

function PlayIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7 7h5v5H7zM12 12h5v5h-5z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function PuzzleIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 4h4v2a2 2 0 104 0V4h2v4h-2a2 2 0 100 4h2v8H4V12h2a2 2 0 100-4H4V4h6z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.25 : 0}
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.25 : 0}
      />
      <path
        d="M4.5 20a7.5 7.5 0 0115 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
