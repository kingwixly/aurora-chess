"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

/**
 * The site header.
 *
 * Two problems with what this replaces. The whole bar sat inside a centred
 * `max-w-7xl`, so on a wide monitor the logo floated somewhere in the middle
 * with empty space either side of it, and every link was crushed together in
 * the centre. And there was no overflow behaviour: as links were added the bar
 * simply got tighter until it wrapped.
 *
 * Now the logo is anchored to the left edge and the account controls to the
 * right, with the links between them. Anything that does not fit goes into a
 * "More" menu rather than squeezing what is already there.
 *
 * On mobile there is no bar at all - see `MobileSidebar` below.
 */

export interface NavLink {
  href: string;
  label: string;
}

/** Ordered by how often people actually use them; the tail overflows first. */
export const NAV_LINKS: NavLink[] = [
  { href: "/play", label: "Play" },
  { href: "/history", label: "Games" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/analysis", label: "Analysis" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/forum", label: "Forum" },
  { href: "/friends", label: "Friends" },
  { href: "/messages", label: "Messages" },
  { href: "/stats", label: "Stats" },
  { href: "/events", label: "Events" },
  { href: "/search", label: "Search" },
  { href: "/blog", label: "Blog" },
];

/** Shown inline on a wide screen; the rest live under More. */
const PRIMARY_COUNT = 6;

export default function SiteHeader({
  right,
  onOpenMenu,
}: {
  /** Account controls - name, settings, log out. Rendered hard right. */
  right?: React.ReactNode;
  onOpenMenu?: () => void;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Any navigation closes the menu, including a link inside it.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const primary = NAV_LINKS.slice(0, PRIMARY_COUNT);
  const overflow = NAV_LINKS.slice(PRIMARY_COUNT);

  return (
    <header className="border-b border-night-700">
      {/* Full width with its own padding, not a centred container - that is
          what pushed the logo away from the corner. */}
      <div className="flex items-center gap-3 px-4 py-2.5 lg:px-6">
        <Link href="/play" className="flex shrink-0 items-center gap-2">
          <Image src="/logo-mark.png" alt="Aurora Chess" width={26} height={26} />
          <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
            Aurora
          </span>
        </Link>

        {/* Mobile gets a sidebar instead of a cramped row of links. */}
        <button
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="ml-auto rounded-lg p-2 text-night-300 hover:bg-night-800 lg:hidden"
        >
          <MenuIcon />
        </button>

        <nav className="ml-6 hidden min-w-0 items-center gap-0.5 lg:flex">
          {primary.map((l) => (
            <NavItem key={l.href} link={l} active={isActive(pathname, l.href)} />
          ))}

          {overflow.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                  overflow.some((l) => isActive(pathname, l.href))
                    ? "text-white"
                    : "text-night-300 hover:bg-night-800 hover:text-white"
                }`}
              >
                More
              </button>

              {moreOpen && (
                <>
                  {/* Click-away, rather than trapping the page behind a menu. */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMoreOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl bg-night-900 p-1 shadow-xl ring-1 ring-inset ring-night-700">
                    {overflow.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive(pathname, l.href)
                            ? "bg-night-800 text-white"
                            : "text-night-300 hover:bg-night-800 hover:text-white"
                        }`}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Hard right, mirroring the logo. */}
        <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">{right}</div>
      </div>
    </header>
  );
}

/**
 * The mobile navigation.
 *
 * A drawer rather than a shrunken topbar. A phone showing a squeezed copy of
 * the desktop bar reads as an afterthought; a drawer is what a mobile app
 * does, and it has room to label things properly.
 */
export function MobileSidebar({
  open,
  onClose,
  right,
}: {
  open: boolean;
  onClose: () => void;
  right?: React.ReactNode;
}) {
  const pathname = usePathname();

  // Close on navigation, and stop the page behind from scrolling while open.
  useEffect(() => {
    onClose();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      <aside
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-night-900 shadow-xl"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-center justify-between border-b border-night-700 px-4 py-3">
          <Link href="/play" className="flex items-center gap-2">
            <Image src="/logo-mark.png" alt="" width={24} height={24} />
            <span className="font-display text-lg font-semibold tracking-tight">Aurora</span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-night-400 hover:bg-night-800"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              &times;
            </span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive(pathname, l.href)
                  ? "bg-aurora-cyan/15 text-aurora-cyan"
                  : "text-night-300 hover:bg-night-800 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {right && (
          <div className="border-t border-night-700 p-3">
            <div className="flex flex-wrap items-center gap-2">{right}</div>
          </div>
        )}
      </aside>
    </div>
  );
}

function NavItem({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
        active ? "bg-night-800 text-white" : "text-night-300 hover:bg-night-800 hover:text-white"
      }`}
    >
      {link.label}
    </Link>
  );
}

/** `/play` must not light up on `/played`, so the boundary is checked. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
