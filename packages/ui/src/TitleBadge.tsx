"use client";

import { TITLE_LABELS, isUnofficialTitle, type Title } from "@eyeonchess/chess";

interface TitleBadgeProps {
  /** Resolved title from the API. Renders nothing when null. */
  title?: Title | null;
  /** Compact variant for dense lists (search results, friend lists). */
  size?: "sm" | "md";
  className?: string;
}

/**
 * The title prefix shown before a username.
 *
 * Official titles render in amber, matching the convention players already know
 * from other sites. Unofficial site titles (AM, UM) render in the Aurora accent
 * so they are visually distinguishable at a glance and cannot be mistaken for a
 * federation title. The tooltip states this outright.
 *
 * This component never decides *whether* a user has a title — the API resolves
 * that, including title bans. If `title` is present here, it is meant to show.
 */
export function TitleBadge({ title, size = "md", className = "" }: TitleBadgeProps) {
  if (!title) return null;

  const unofficial = isUnofficialTitle(title);
  const label = TITLE_LABELS[title];
  const tooltip = unofficial ? `${label} — unofficial site title` : label;

  const sizeClasses = size === "sm" ? "text-[10px] px-1 py-0" : "text-xs px-1.5 py-0.5";
  const colorClasses = unofficial
    ? "bg-violet-500/15 text-violet-300 ring-violet-500/30"
    : "bg-amber-500/15 text-amber-300 ring-amber-500/30";

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center rounded font-bold tracking-wide ring-1 ring-inset ${sizeClasses} ${colorClasses} ${className}`}
    >
      {title}
    </span>
  );
}

interface PlayerNameProps {
  username: string;
  title?: Title | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Username with its title badge, correctly spaced.
 *
 * Prefer this over composing {@link TitleBadge} by hand at each call site —
 * it keeps spacing and wrapping consistent everywhere a player is named.
 */
export function PlayerName({ username, title, size = "md", className = "" }: PlayerNameProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <TitleBadge title={title} size={size} />
      <span>{username}</span>
    </span>
  );
}

export default TitleBadge;
