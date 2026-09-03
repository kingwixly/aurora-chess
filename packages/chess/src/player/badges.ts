/**
 * Badges.
 *
 * Credentials and achievements shown on a profile. Distinct from titles in
 * three ways that matter:
 *
 * - A user holds **many** badges; a user displays **one** title.
 * - Badges appear only on the profile page, never beside a username in game
 *   lists, chat, or search results. They are something you look up, not
 *   something that follows a player around.
 * - Badges can express things that are not playing strength - arbiter
 *   certification, staff role, event participation - which is exactly why
 *   FIDE Arbiter is a badge rather than being forced into the title enum.
 *
 * Users choose which badges to **pin**; pinned badges sort first on the profile.
 *
 * Keys are stable strings rather than an enum, because badges are expected to
 * accrue over time and adding one should never require a migration.
 */

export type BadgeGrant =
  /** Granted by the system when criteria are met. */
  | "automatic"
  /** Granted by staff after checking evidence. */
  | "verified"
  /** Granted by staff at their discretion. */
  | "manual";

export type BadgeCategory = "credential" | "achievement" | "community" | "event";

export interface BadgeDefinition {
  /** Stable key persisted in `UserBadge.badgeKey`. Never change these. */
  key: string;
  label: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  grant: BadgeGrant;
  /**
   * Whether staff must record supporting evidence (a FIDE ID, a federation
   * reference) when granting. Enforced by the admin UI, not by this module.
   */
  requiresEvidence?: boolean;
}

export const BADGES: readonly BadgeDefinition[] = [
  // ── Credentials ───────────────────────────────────────────
  {
    key: "fide-arbiter",
    label: "FIDE Certified Arbiter",
    description: "Holds a FIDE Arbiter certification, verified by Aurora staff.",
    icon: "\u2696",
    category: "credential",
    grant: "verified",
    requiresEvidence: true,
  },
  {
    key: "fide-international-arbiter",
    label: "FIDE International Arbiter",
    description: "Holds the International Arbiter title, verified by Aurora staff.",
    icon: "\u2696",
    category: "credential",
    grant: "verified",
    requiresEvidence: true,
  },
  {
    key: "fide-trainer",
    label: "FIDE Trainer",
    description: "Holds a FIDE trainer certification, verified by Aurora staff.",
    icon: "\u25C7",
    category: "credential",
    grant: "verified",
    requiresEvidence: true,
  },
  {
    key: "fide-verified",
    label: "FIDE Verified",
    description:
      "FIDE ID confirmed against the player's account. Used when a player wants their rating and details kept private.",
    // A path rather than an emoji: the badge carries FIDE's own mark, and a
    // green tick is not that. The UI renders any icon starting with "/" as an
    // image.
    icon: "/fide/fide-verified.png",
    category: "credential",
    grant: "verified",
    requiresEvidence: true,
  },
  {
    key: "club-official",
    label: "Club Official",
    description: "Recognised representative of an affiliated chess club.",
    icon: "\u265E",
    category: "credential",
    grant: "verified",
    requiresEvidence: true,
  },

  // ── Achievements ──────────────────────────────────────────
  {
    key: "tournament-winner",
    label: "Tournament Winner",
    description: "Won an Aurora tournament.",
    icon: "\u2605",
    category: "achievement",
    grant: "automatic",
  },
  {
    key: "puzzle-streak-30",
    label: "Streak Keeper",
    description: "Solved puzzles on 30 consecutive days.",
    icon: "\u25A9",
    category: "achievement",
    grant: "automatic",
  },
  {
    key: "marathon",
    label: "Marathon",
    description: "Played 1000 rated games.",
    icon: "◴",
    category: "achievement",
    grant: "automatic",
  },
  {
    key: "giant-slayer",
    label: "Giant Slayer",
    description: "Beat an opponent rated 400 or more points higher.",
    icon: "\u2694",
    category: "achievement",
    grant: "automatic",
  },
  {
    key: "centurion",
    label: "Centurion",
    description: "Won 100 rated games.",
    icon: "⛨",
    category: "achievement",
    grant: "automatic",
  },

  // ── Community ─────────────────────────────────────────────
  {
    key: "founder",
    label: "Founder",
    description: "One of the first 50 accounts on Aurora Chess.",
    icon: "\u25D2",
    category: "community",
    // Granted automatically at signup for the first 50, but staff can also
    // grant or revoke it - someone who deleted and remade an account should not
    // lose it, and someone who bought one should not keep it.
    grant: "manual",
  },
  {
    key: "contributor",
    label: "Contributor",
    description: "Contributed to Aurora Chess itself.",
    icon: "⚒",
    category: "community",
    grant: "manual",
  },
  {
    key: "author",
    label: "Author",
    description: "Published articles or opening theory on Aurora.",
    icon: "\u2637",
    category: "community",
    grant: "manual",
  },
  {
    key: "patron",
    label: "Patron",
    description: "Supported Aurora Chess.",
    icon: "\u25C6",
    category: "community",
    grant: "manual",
  },
] as const;

const BADGE_BY_KEY = new Map(BADGES.map((b) => [b.key, b]));

/** Accounts numbered at or below this receive the Founder badge automatically. */
export const FOUNDER_CUTOFF = 50;

/**
 * How many badges a user may pin.
 *
 * Kept small on purpose: pinning everything is the same as pinning nothing.
 */
export const MAX_PINNED_BADGES = 3;

export function getBadge(key: string | null | undefined): BadgeDefinition | null {
  if (!key) return null;
  return BADGE_BY_KEY.get(key) ?? null;
}

export function isValidBadgeKey(key: unknown): key is string {
  return typeof key === "string" && BADGE_BY_KEY.has(key);
}

/** Badges staff may grant by hand, for the admin picker. */
export function grantableBadges(): BadgeDefinition[] {
  return BADGES.filter((b) => b.grant !== "automatic");
}

export function badgesByCategory(category: BadgeCategory): BadgeDefinition[] {
  return BADGES.filter((b) => b.category === category);
}

/** A badge a user holds, as persisted. */
export interface HeldBadge {
  badgeKey: string;
  pinned?: boolean;
  pinOrder?: number | null;
  grantedAt?: string | Date;
}

export interface ResolvedBadge extends BadgeDefinition {
  pinned: boolean;
  grantedAt?: string | Date;
}

/**
 * Order a user's badges for display: pinned first in their chosen order, then
 * the rest by category and grant time.
 *
 * Unknown keys are dropped rather than rendered as a blank - a badge removed
 * from {@link BADGES} should disappear from profiles, not leave a hole. Pins
 * beyond {@link MAX_PINNED_BADGES} are demoted rather than rejected, so a lower
 * cap later cannot leave anyone in a broken state.
 */
export function resolveBadges(held: readonly HeldBadge[]): ResolvedBadge[] {
  const known = held.filter((h) => BADGE_BY_KEY.has(h.badgeKey));

  const pinned = known
    .filter((h) => h.pinned)
    .sort((a, b) => (a.pinOrder ?? 0) - (b.pinOrder ?? 0))
    .slice(0, MAX_PINNED_BADGES);

  const pinnedKeys = new Set(pinned.map((h) => h.badgeKey));
  const rest = known.filter((h) => !pinnedKeys.has(h.badgeKey));

  const categoryRank: Record<BadgeCategory, number> = {
    credential: 0,
    achievement: 1,
    community: 2,
    event: 3,
  };

  rest.sort((a, b) => {
    const da = BADGE_BY_KEY.get(a.badgeKey)!;
    const db = BADGE_BY_KEY.get(b.badgeKey)!;
    const byCategory = categoryRank[da.category] - categoryRank[db.category];
    if (byCategory !== 0) return byCategory;
    return da.label.localeCompare(db.label);
  });

  const toResolved = (h: HeldBadge, isPinned: boolean): ResolvedBadge => ({
    ...BADGE_BY_KEY.get(h.badgeKey)!,
    pinned: isPinned,
    grantedAt: h.grantedAt,
  });

  return [...pinned.map((h) => toResolved(h, true)), ...rest.map((h) => toResolved(h, false))];
}

/** Just the pinned badges, for a compact profile header. */
export function pinnedBadges(held: readonly HeldBadge[]): ResolvedBadge[] {
  return resolveBadges(held).filter((b) => b.pinned);
}
