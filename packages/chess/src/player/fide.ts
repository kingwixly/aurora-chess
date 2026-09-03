/**
 * FIDE credentials.
 *
 * Two separate things, deliberately kept apart:
 *
 * - **Verification** is a boolean on the user. It means site verification is
 *   complete *and* a registered FIDE account has been confirmed. It renders as
 *   a mark before everything else - shield, title, name - because it qualifies
 *   the identity rather than the playing strength.
 * - **The profile panel** is staff-maintained detail shown only on a player's
 *   profile: FIDE's own rating pools, arena and arbiter titles, a link.
 *
 * Arena titles live here rather than in the title system on purpose. They are
 * earned on FIDE Online Arena, not over the board, and showing an AGM beside a
 * username next to a real GM would misrepresent both.
 */

/** FIDE Arena titles - online-only, distinct from over-the-board titles. */
export const ARENA_TITLES = ["AGM", "AIM", "AFM", "ACM"] as const;

/** Arbiter and trainer credentials, which say nothing about playing strength. */
export const FIDE_OFFICIAL_TITLES = ["IA", "FA", "NA", "FST", "FT", "FI", "NI", "DI"] as const;

export type ArenaTitle = (typeof ARENA_TITLES)[number];
export type FideOfficialTitle = (typeof FIDE_OFFICIAL_TITLES)[number];
export type FidePanelTitle = ArenaTitle | FideOfficialTitle;

export const FIDE_PANEL_TITLE_LABELS: Record<FidePanelTitle, string> = {
  AGM: "Arena Grandmaster",
  AIM: "Arena International Master",
  AFM: "Arena FIDE Master",
  ACM: "Arena Candidate Master",
  IA: "International Arbiter",
  FA: "FIDE Arbiter",
  NA: "National Arbiter",
  FST: "FIDE Senior Trainer",
  FT: "FIDE Trainer",
  FI: "FIDE Instructor",
  NI: "National Instructor",
  DI: "Developmental Instructor",
};

/** Every credential staff can attach to the panel, for the admin picker. */
export const ALL_FIDE_PANEL_TITLES = [...ARENA_TITLES, ...FIDE_OFFICIAL_TITLES] as const;

export function isFidePanelTitle(value: unknown): value is FidePanelTitle {
  return typeof value === "string" && (ALL_FIDE_PANEL_TITLES as readonly string[]).includes(value);
}

export interface FideProfileData {
  enabled: boolean;
  standard?: number | null;
  rapid?: number | null;
  blitz?: number | null;
  arenaTitles?: string[];
  profileUrl?: string | null;
  federation?: string | null;
  fideId?: string | null;
}

/**
 * Whether the panel should be shown publicly.
 *
 * Requires the staff switch *and* at least one populated field: an enabled but
 * empty panel is worse than no panel, since it implies the data is missing
 * rather than simply not entered yet.
 */
export function shouldShowFideProfile(p: FideProfileData | null | undefined): boolean {
  if (!p || !p.enabled) return false;
  return Boolean(
    p.standard ||
    p.rapid ||
    p.blitz ||
    (p.arenaTitles && p.arenaTitles.length > 0) ||
    p.profileUrl ||
    p.fideId
  );
}

/**
 * Only accept FIDE's own domain for the profile link.
 *
 * The field is staff-entered and rendered as an outbound link on a public
 * profile, so it is an obvious place for a mistyped or hostile URL to end up.
 */
export function isValidFideProfileUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return u.hostname === "ratings.fide.com" || u.hostname.endsWith(".fide.com");
  } catch {
    return false;
  }
}
