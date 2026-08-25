"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/play", label: "Play" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/analysis", label: "Analysis" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/events", label: "Events" },
  { href: "/search", label: "Search" },
  { href: "/history", label: "Games" },
  { href: "/stats", label: "Stats" },
  { href: "/friends", label: "Friends" },
  { href: "/messages", label: "Messages" },
  { href: "/collections", label: "Collections" },
  { href: "/settings", label: "Settings" },
];

/**
 * Navigation for small screens.
 *
 * The desktop nav is `hidden md:flex`, which meant a phone had no way to reach
 * puzzles, the leaderboard, messages or anything else — every page existed and
 * none of them were findable. Chess is played on phones more than anywhere
 * else, so this is not a nice-to-have.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="rounded-lg px-3 py-2 text-night-400 transition-colors hover:text-white"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <>
          {/* Tapping anywhere else closes it, which is what people expect. */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav className="absolute right-4 z-50 mt-2 w-52 overflow-hidden rounded-xl bg-night-900 py-1 shadow-xl ring-1 ring-inset ring-night-700">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === l.href ? "page" : undefined}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  pathname === l.href
                    ? "bg-night-800 font-medium text-aurora-cyan"
                    : "text-night-300 hover:bg-night-800"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
