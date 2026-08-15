import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Your standing | Aurora Chess",
  description: "Your moderation record and appeals.",
};

/**
 * Standing pages: light theme, deliberately.
 *
 * The rest of Aurora is dark, and a punishment notice rendered in the same
 * skin as the game reads as part of the game. Light makes it plainly a
 * different kind of page — an account record, not a place to play — and it is
 * easier to read carefully, which is what people do here.
 */
export default function StandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="standing-scope min-h-screen bg-[#f6f7fb] text-[#0A0F1C]">
      <header className="border-b border-[#dde1ea] bg-white">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-8 w-8 object-contain" />
            <div>
              <p className="font-display text-lg font-semibold leading-tight">
                Aurora Chess account standing
              </p>
              <p className="text-xs text-[#5a6478]">Your moderation record and appeals</p>
            </div>
          </div>
          <Link
            href="https://aurorachess.org"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#0A5C86] ring-1 ring-inset ring-[#c9d2e0] transition-colors hover:bg-[#eef1f7]"
          >
            Back to Aurora
          </Link>
        </div>
      </header>

      <nav className="border-b border-[#dde1ea] bg-white">
        <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto px-6">
          {[
            { href: "/standing", label: "Overview" },
            { href: "/standing/history", label: "History" },
            { href: "/standing/rules", label: "Rules" },
            { href: "/standing/appeal", label: "Appeal" },
            { href: "/standing/how-it-works", label: "How moderation works" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-[#5a6478] transition-colors hover:border-[#c9d2e0] hover:text-[#0A0F1C]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>

      {children}

      <footer className="border-t border-[#dde1ea] bg-white">
        <div className="mx-auto max-w-2xl px-6 py-6 text-center text-xs text-[#5a6478]">
          Every action on your account was issued by a person.{" "}
          <Link
            href="/standing/how-it-works"
            className="text-[#0A5C86] underline-offset-2 hover:underline"
          >
            How moderation works
          </Link>
        </div>
      </footer>
    </div>
  );
}
