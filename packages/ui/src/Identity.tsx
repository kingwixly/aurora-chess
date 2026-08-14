"use client";

import {
  TITLE_LABELS,
  TITLE_CRITERIA_TEXT,
  isUnofficialTitle,
  getBadge,
  flagEmoji,
  getCountry,
  type Title,
} from "@aurora/chess";

/* ── Aurora band ──────────────────────────────────────────
   The signature element: the logo's ribbon flattened into a line. It marks the
   top of the page and separates major sections, so the brand appears as
   structure rather than as a logo pasted in a corner. */

export function AuroraBand({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-aurora opacity-80 ${className}`} aria-hidden="true" />;
}

/* ── FIDE verification ──────────────────────────────────── */

/**
 * The FIDE Details Verified mark.
 *
 * Renders before the shield and the title, because it qualifies *who someone
 * is* rather than how well they play — it means site verification is complete
 * and a registered FIDE account has been confirmed.
 *
 * The full FIDE lockup is unreadable at this size, so the mark is the check in
 * a roundel; the lockup itself appears on the profile panel where there is room
 * for it.
 */
export function FideVerifiedMark({ size = 16 }: { size?: number }) {
  const label = "FIDE details verified";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/fide/fide-verified.png"
      alt={label}
      title={label}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full"
    />
  );
}

/* ── Titles ─────────────────────────────────────────────── */

interface TitleBadgeProps {
  title?: Title | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * The title prefix shown before a username.
 *
 * Federation titles render amber, matching the convention players already know
 * from elsewhere. Aurora's own titles render in the brand violet so nobody
 * mistakes an AM for a FIDE credential — the tooltip says so outright, and the
 * criteria line explains how it was earned.
 *
 * Set in the mono face: a title is a credential, and it reads alongside a
 * rating rather than alongside prose.
 */
export function TitleBadge({ title, size = "md", className = "" }: TitleBadgeProps) {
  if (!title) return null;

  const unofficial = isUnofficialTitle(title);
  const tooltip = `${TITLE_LABELS[title]} — ${TITLE_CRITERIA_TEXT[title]}`;

  const sizing = size === "sm" ? "text-[10px] px-1 py-0" : "text-[11px] px-1.5 py-0.5";
  const tone = unofficial
    ? "bg-aurora-violet/20 text-[#b6a6ff] ring-aurora-violet/40"
    : "bg-amber-500/15 text-amber-300 ring-amber-500/30";

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex shrink-0 items-center rounded font-mono font-bold leading-none tracking-wide ring-1 ring-inset ${sizing} ${tone} ${className}`}
    >
      {title}
    </span>
  );
}

/**
 * The staff mark.
 *
 * The Aurora knight beside a name, meaning this account speaks for the site.
 * Sits after the FIDE mark and before the title, so the order reads
 * verification, then who they are here, then how well they play.
 *
 * A distinct mark from the site favicon on purpose: the favicon is "this is
 * Aurora", and this is "this person is Aurora staff". Reusing one for both
 * would make every browser tab look like a staff badge.
 *
 * The knight is drawn lighter than the source artwork — the original navy is
 * near-invisible against the dark header, which left a ribbon floating with no
 * piece under it.
 */
export function StaffMark({ rank, size = 16 }: { rank?: string | null; size?: number }) {
  if (!rank) return null;
  const label = `Aurora ${rank}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/staff-mark-64.png"
      alt={label}
      title={label}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 object-contain"
    />
  );
}

/**
 * The moderator shield.
 *
 * Sits before the title rather than replacing it, so a moderator who is also an
 * IM shows both. Kept visually distinct from every title colour.
 */
export function ModShield({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span
      title="Aurora moderator"
      aria-label="Aurora moderator"
      className={`shrink-0 text-emerald-400 ${size === "sm" ? "text-[11px]" : "text-xs"}`}
    >
      {/* U+1F6E1 shield */}
      &#128737;&#65039;
    </span>
  );
}

/* ── Flairs ─────────────────────────────────────────────── */

/**
 * The flair a player has chosen to display beside their name.
 *
 * Unlike badges — which live on the profile — one flair follows the player
 * around. It is purely cosmetic and carries no competitive meaning, which is
 * why it renders as a bare glyph rather than a chip: it should read as
 * decoration, not as a second title.
 */
export function FlairIcon({
  flairKey,
  className = "",
}: {
  flairKey?: string | null;
  className?: string;
}) {
  const badge = getBadge(flairKey);
  if (!badge) return null;
  return (
    <span title={badge.label} aria-label={badge.label} className={`shrink-0 text-sm ${className}`}>
      {badge.icon}
    </span>
  );
}

/* ── Player name ────────────────────────────────────────── */

interface PlayerNameProps {
  username: string;
  title?: Title | null;
  /** FIDE details verified. Renders before everything else. */
  fideVerified?: boolean;
  /** Staff rank, e.g. "moderator" or "admin". Renders the Aurora mark. */
  staffRank?: string | null;
  /** ISO 3166-1 alpha-2. Renders a flag before the name. */
  countryCode?: string | null;
  modShield?: boolean;
  flair?: string | null;
  rating?: number;
  size?: "sm" | "md";
  className?: string;
  /** Render as a link to the profile. */
  href?: string;
}

/**
 * A player, named the way they appear everywhere: shield, title, name, flair,
 * rating.
 *
 * Prefer this over composing the parts by hand at each call site — consistent
 * ordering is what makes a title scannable in a game list.
 */
export function PlayerName({
  username,
  title,
  fideVerified,
  staffRank,
  countryCode,
  modShield,
  flair,
  rating,
  size = "md",
  className = "",
  href,
}: PlayerNameProps) {
  const content = (
    <>
      {fideVerified && <FideVerifiedMark size={size === "sm" ? 14 : 16} />}
      {staffRank && <StaffMark rank={staffRank} size={size === "sm" ? 14 : 16} />}
      {modShield && <ModShield size={size} />}
      <TitleBadge title={title} size={size} />
      {countryCode && (
        <span
          title={getCountry(countryCode)?.name ?? countryCode}
          aria-label={getCountry(countryCode)?.name ?? countryCode}
          className="shrink-0 leading-none"
        >
          {flagEmoji(countryCode)}
        </span>
      )}
      <span className="truncate font-medium">{username}</span>
      <FlairIcon flairKey={flair} />
      {rating !== undefined && (
        <span className="shrink-0 font-mono text-xs text-night-600">{rating}</span>
      )}
    </>
  );

  const classes = `inline-flex min-w-0 items-center gap-1.5 ${
    size === "sm" ? "text-sm" : ""
  } ${className}`;

  if (href) {
    return (
      <a href={href} className={`${classes} hover:text-aurora-cyan focus-visible:text-aurora-cyan`}>
        {content}
      </a>
    );
  }
  return <span className={classes}>{content}</span>;
}

/* ── Profile badges ─────────────────────────────────────── */

export interface ProfileBadge {
  key: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  pinned: boolean;
}

/**
 * A player's badges, shown on their profile only.
 *
 * Deliberately absent from game lists, search results and chat: badges are
 * something you look up about a player, not something that follows them around.
 * Pinned badges lead and are visually raised.
 */
export function BadgeShelf({ badges }: { badges: ProfileBadge[] }) {
  if (badges.length === 0) {
    return (
      <p className="text-sm text-night-600">
        No badges yet. They are awarded for credentials, achievements, and contributions.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {badges.map((b) => {
        // The FIDE badge carries FIDE's own lockup as its entire content. It
        // exists for players who want a title recognised while keeping their
        // rating and ID private, so it has to read as the official mark rather
        // than as a row in a list.
        const isLockup = b.key === "fide-verified";
        return (
          <li
            key={b.key}
            title={b.description}
            className={`flex items-center gap-2 rounded-lg ring-1 ring-inset transition-colors ${
              isLockup ? "px-3 py-2" : "px-3 py-2"
            } ${
              b.pinned
                ? "bg-aurora-soft ring-aurora-cyan/40"
                : "bg-night-800 ring-night-700 hover:ring-night-600"
            }`}
          >
            {isLockup ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/fide/fide-verified-full.png"
                alt={b.label}
                className="h-6 shrink-0 object-contain"
              />
            ) : (
              <>
                {b.icon.startsWith("/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.icon} alt="" className="h-5 w-5 shrink-0 object-contain" />
                ) : (
                  <span className="text-lg leading-none">{b.icon}</span>
                )}
                <span className="text-sm font-medium">{b.label}</span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ── FIDE profile panel ─────────────────────────────────── */

export interface FidePanelData {
  standard?: number | null;
  rapid?: number | null;
  blitz?: number | null;
  arenaTitles?: string[];
  profileUrl?: string | null;
  federation?: string | null;
  fideId?: string | null;
}

/**
 * Staff-maintained FIDE details, shown on a profile only.
 *
 * Kept visually distinct from Aurora's own rating pools: these are FIDE's
 * numbers, not the site's, and conflating the two would be the single most
 * misleading thing this page could do. Hence the FIDE lockup at the top and
 * the explicit note underneath.
 *
 * Arena and arbiter titles appear here and nowhere else — they are not
 * over-the-board playing titles and must not sit beside a username.
 */
export function FideProfilePanel({
  data,
  titleLabels,
}: {
  data: FidePanelData;
  /** Map of credential code to full name, from the shared package. */
  titleLabels?: Record<string, string>;
}) {
  const pools = [
    ["Standard", data.standard],
    ["Rapid", data.rapid],
    ["Blitz", data.blitz],
  ] as const;

  const hasAnyPool = pools.some(([, v]) => typeof v === "number" && v > 0);

  return (
    <section className="overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
      <div className="flex items-center justify-between gap-4 border-b border-night-700 px-5 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/fide/fide-verified-full.png" alt="FIDE details verified" className="h-7" />
        {data.federation && (
          <span className="font-mono text-xs uppercase tracking-wider text-night-400">
            {data.federation}
          </span>
        )}
      </div>

      {hasAnyPool && (
        <dl className="grid grid-cols-3 gap-px bg-night-700">
          {pools.map(([label, value]) => (
            <div key={label} className="bg-night-900 px-4 py-3 text-center">
              <dt className="text-xs uppercase tracking-wider text-night-500">{label}</dt>
              <dd
                className={`mt-1 font-mono text-2xl font-bold tracking-tight ${
                  value ? "text-white" : "text-night-500"
                }`}
              >
                {/* Unrated is meaningfully different from zero. */}
                {value || "\u2014"}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {data.arenaTitles && data.arenaTitles.length > 0 && (
        <div className="border-t border-night-700 px-5 py-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-night-500">
            Arena and official titles
          </p>
          <ul className="flex flex-wrap gap-2">
            {data.arenaTitles.map((t) => (
              <li
                key={t}
                title={titleLabels?.[t] ?? t}
                className="rounded bg-night-800 px-2 py-1 font-mono text-xs font-bold text-night-300 ring-1 ring-inset ring-night-700"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-night-700 px-5 py-3">
        <p className="text-xs text-night-500">
          FIDE ratings, separate from Aurora ratings.
          {data.fideId && <span className="ml-1 font-mono">ID {data.fideId}</span>}
        </p>
        {data.profileUrl && (
          <a
            href={data.profileUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="shrink-0 text-xs font-medium text-aurora-cyan hover:underline"
          >
            FIDE profile
          </a>
        )}
      </div>
    </section>
  );
}
