/**
 * Player titles.
 *
 * Two independent tracks:
 *
 * - **Manual titles** are assigned by staff and are never computed. These cover
 *   the FIDE titles plus NM, which is a national federation title rather than a
 *   FIDE one but behaves identically here: staff-assigned, never automatic.
 * - **Auto titles** are unofficial, site-local, and derived from peak rating.
 *   They exist so a strong player can carry a title without ever touching FIDE.
 *
 * A player displays at most one title. A manual title always fully masks an auto
 * title; the auto title is still computed and stored underneath so that clearing
 * a manual title restores whatever the player independently earned.
 */

/** Staff-assigned titles. FIDE titles plus NM/WNM. Never computed. */
export const MANUAL_TITLES = [
  "GM",
  "WGM",
  "IM",
  "WIM",
  "FM",
  "WFM",
  "CM",
  "WCM",
  "NM",
  "WNM",
] as const;

export type ManualTitle = (typeof MANUAL_TITLES)[number];

/** Unofficial site titles, derived from peak rating. */
export const AUTO_TITLES = ["AM", "UM"] as const;

export type AutoTitle = (typeof AUTO_TITLES)[number];

export type Title = ManualTitle | AutoTitle;

/**
 * Peak-rating thresholds for auto titles, highest first.
 *
 * Order matters: `computeAutoTitle` walks this list and takes the first match,
 * so a 2400 player gets AM rather than UM.
 */
export const AUTO_TITLE_THRESHOLDS: ReadonlyArray<readonly [AutoTitle, number]> = [
  ["AM", 2400],
  ["UM", 2200],
] as const;

export const TITLE_LABELS: Record<Title, string> = {
  GM: "Grandmaster",
  WGM: "Woman Grandmaster",
  IM: "International Master",
  WIM: "Woman International Master",
  FM: "FIDE Master",
  WFM: "Woman FIDE Master",
  CM: "Candidate Master",
  WCM: "Woman Candidate Master",
  NM: "National Master",
  WNM: "Woman National Master",
  AM: "Aurora Master",
  UM: "Undermaster",
};

/**
 * Titles that are unofficial and site-local. Used by the UI to mark them as
 * such, so nobody mistakes an AM for a federation title.
 */
export const UNOFFICIAL_TITLES: ReadonlySet<Title> = new Set<Title>(AUTO_TITLES);

export function isManualTitle(value: unknown): value is ManualTitle {
  return typeof value === "string" && (MANUAL_TITLES as readonly string[]).includes(value);
}

export function isAutoTitle(value: unknown): value is AutoTitle {
  return typeof value === "string" && (AUTO_TITLES as readonly string[]).includes(value);
}

export function isUnofficialTitle(title: Title): boolean {
  return UNOFFICIAL_TITLES.has(title);
}

/**
 * The auto title a player has earned at a given peak rating.
 *
 * Takes **peak** rating, not current. Auto titles are sticky: once earned they
 * are never lost to a losing streak, which is what stops a 2401-rated player
 * flickering in and out of AM game to game.
 *
 * @param peakRating - Highest rating the player has ever held.
 * @returns The highest auto title earned, or null if below all thresholds.
 */
export function computeAutoTitle(peakRating: number): AutoTitle | null {
  for (const [title, threshold] of AUTO_TITLE_THRESHOLDS) {
    if (peakRating >= threshold) return title;
  }
  return null;
}

/** The stored title state of a user, as persisted on the User row. */
export interface TitleState {
  titleManual?: ManualTitle | null;
  titleAuto?: AutoTitle | null;
  titleBanned?: boolean;
}

/**
 * The single title to display for a user.
 *
 * Precedence: a title ban suppresses everything, then a manual title fully
 * masks an auto title. Nothing is destroyed by this — lifting a ban or clearing
 * a manual title reveals whatever sits underneath.
 *
 * This must be applied server-side before serialization. The web app is a PWA
 * with aggressive caching, so a title that reaches the client survives in the
 * cache and in the offline shell regardless of what the components do with it.
 */
export function resolveTitle(state: TitleState | null | undefined): Title | null {
  if (!state) return null;
  if (state.titleBanned) return null;
  return state.titleManual ?? state.titleAuto ?? null;
}
