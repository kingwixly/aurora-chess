/**
 * Player titles.
 *
 * Two sources, resolved into one displayed title:
 *
 * - **Manual titles** are staff-assigned and never computed. They cover the
 *   FIDE titles (WCM and above, granted only to verified holders) and Aurora's
 *   own staff-granted masters.
 * - **Automatic titles** are unofficial and earned by performance, so a strong
 *   player carries a title without ever needing a FIDE ID.
 *
 * A player displays at most one title. A manual title always fully masks an
 * automatic one; the automatic title is still computed and stored underneath so
 * that clearing a manual title restores whatever the player earned themselves.
 *
 * Arbiter credentials are deliberately NOT titles - they say nothing about
 * playing strength. They live in the badge system instead.
 */

// ── Manual ──────────────────────────────────────────────────

/** FIDE titles, WCM and above. Granted only to verified holders. */
export const FIDE_TITLES = ["GM", "WGM", "IM", "WIM", "FM", "WFM", "CM", "WCM"] as const;

/**
 * National federation titles. Issued by a national body rather than FIDE, so
 * they are verified separately, but they are still real-world credentials and
 * are treated as official alongside the FIDE set.
 */
export const NATIONAL_TITLES = ["NM", "WNM"] as const;

/** Unofficial titles granted at staff discretion rather than by formula. */
export const MANUAL_UNOFFICIAL_TITLES = ["HM", "RM", "OM"] as const;

export const MANUAL_TITLES = [
  ...FIDE_TITLES,
  ...NATIONAL_TITLES,
  ...MANUAL_UNOFFICIAL_TITLES,
] as const;

/** Every real-world credential: FIDE plus national. */
export const OFFICIAL_TITLES = [...FIDE_TITLES, ...NATIONAL_TITLES] as const;

export type FideTitle = (typeof FIDE_TITLES)[number];
export type NationalTitle = (typeof NATIONAL_TITLES)[number];
export type OfficialTitle = FideTitle | NationalTitle;
export type ManualTitle = (typeof MANUAL_TITLES)[number];

// ── Automatic ───────────────────────────────────────────────

/**
 * Unofficial automatic titles, in descending precedence.
 *
 * Order is authoritative: {@link computeAutoTitle} returns the first whose
 * criteria are met. Overall strength outranks format specialists, which outrank
 * the achievement-based titles.
 */
export const AUTO_TITLES = ["UM", "AM", "BM", "TdM", "PM", "EM", "TM"] as const;

export type AutoTitle = (typeof AUTO_TITLES)[number];

export type Title = ManualTitle | AutoTitle;

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
  HM: "Honorary Master",
  RM: "Resident Master",
  OM: "Opening Master",
  UM: "Undermaster",
  AM: "Aurora Master",
  BM: "Bullet/Blitz Master",
  TdM: "Traditional Master",
  PM: "Puzzle Master",
  EM: "Endgame Master",
  TM: "Tournament Master",
};

/** How each title is obtained. Shown on hover and on the titles reference page. */
export const TITLE_CRITERIA_TEXT: Record<Title, string> = {
  GM: "Verified FIDE title",
  WGM: "Verified FIDE title",
  IM: "Verified FIDE title",
  WIM: "Verified FIDE title",
  FM: "Verified FIDE title",
  WFM: "Verified FIDE title",
  CM: "Verified FIDE title",
  WCM: "Verified FIDE title",
  NM: "Verified national federation title",
  WNM: "Verified national federation title",
  HM: "Awarded at staff discretion for exemplary performance or contribution to the community",
  RM: "Awarded at staff discretion to certified chess club masters rated 2200 or above",
  OM: "Awarded at staff discretion to popular contributors of articles or forum posts",
  UM: "Reached 2700 overall",
  AM: "Reached 2500 overall",
  BM: "Reached 2500 in bullet or blitz",
  TdM: "Reached 2500 in classical",
  PM: "Ranked in the top 5% of puzzle solvers",
  EM: "Sustained win rate in sub-7-piece endings",
  TM: "Won 3 or more major tournaments, excluding titled events",
};

/** Titles that are Aurora-local rather than federation-issued. */
export const UNOFFICIAL_TITLES: ReadonlySet<Title> = new Set<Title>([
  ...AUTO_TITLES,
  ...MANUAL_UNOFFICIAL_TITLES,
]);

// ── Thresholds ──────────────────────────────────────────────

/**
 * Thresholds, on the Glicko-2 scale.
 *
 * Ratings moved from a 1200-centred Elo to a 1500-centred Glicko-2, so every
 * bar shifts by the same 300 points. Leaving them alone would have made every
 * title 300 points easier overnight.
 */
export const TITLE_THRESHOLDS = {
  UM_OVERALL: 2700,
  AM_OVERALL: 2500,
  BM_SPEED: 2500,
  TDM_CLASSICAL: 2500,
  /** Puzzle rating alone is noisy; require a real sample behind the percentile. */
  PM_MIN_SOLVED: 200,
  PM_PERCENTILE: 0.95,
  EM_WIN_RATE: 0.65,
  EM_MIN_GAMES: 50,
  TM_WINS: 3,
} as const;

// ── Guards ──────────────────────────────────────────────────

export function isManualTitle(value: unknown): value is ManualTitle {
  return typeof value === "string" && (MANUAL_TITLES as readonly string[]).includes(value);
}

export function isAutoTitle(value: unknown): value is AutoTitle {
  return typeof value === "string" && (AUTO_TITLES as readonly string[]).includes(value);
}

export function isFideTitle(value: unknown): value is FideTitle {
  return typeof value === "string" && (FIDE_TITLES as readonly string[]).includes(value);
}

export function isNationalTitle(value: unknown): value is NationalTitle {
  return typeof value === "string" && (NATIONAL_TITLES as readonly string[]).includes(value);
}

/** A real-world credential, FIDE or national, as opposed to an Aurora title. */
export function isOfficialTitle(value: unknown): value is OfficialTitle {
  return isFideTitle(value) || isNationalTitle(value);
}

export function isUnofficialTitle(title: Title): boolean {
  return UNOFFICIAL_TITLES.has(title);
}

// ── Computation ─────────────────────────────────────────────

/**
 * Everything the automatic titles are derived from.
 *
 * Rating fields are **peak** values, not current. Automatic titles are sticky:
 * once earned they are never lost to a losing streak, which stops a 2401-rated
 * player flickering in and out of a title game to game.
 */
export interface TitleCriteria {
  peakOverall: number;
  peakBullet: number;
  peakBlitz: number;
  peakClassical: number;
  puzzlePeak: number;
  puzzlesSolved: number;
  /**
   * Puzzle rating at the 95th percentile across all eligible solvers.
   *
   * PM is a *ranking*, not a fixed bar, so this is recomputed periodically and
   * passed in rather than hardcoded. A zero or missing value disables PM
   * instead of granting it to everyone -- on a new site the population is too
   * small for a percentile to mean anything.
   */
  puzzlePercentileCutoff: number;
  endgameWins: number;
  endgameGames: number;
  tournamentWins: number;
}

const EMPTY_CRITERIA: TitleCriteria = {
  peakOverall: 0,
  peakBullet: 0,
  peakBlitz: 0,
  peakClassical: 0,
  puzzlePeak: 0,
  puzzlesSolved: 0,
  puzzlePercentileCutoff: 0,
  endgameWins: 0,
  endgameGames: 0,
  tournamentWins: 0,
};

/** Predicates in precedence order -- first match wins. */
const AUTO_TITLE_RULES: ReadonlyArray<readonly [AutoTitle, (c: TitleCriteria) => boolean]> = [
  ["UM", (c) => c.peakOverall >= TITLE_THRESHOLDS.UM_OVERALL],
  ["AM", (c) => c.peakOverall >= TITLE_THRESHOLDS.AM_OVERALL],
  [
    "BM",
    (c) => c.peakBullet >= TITLE_THRESHOLDS.BM_SPEED || c.peakBlitz >= TITLE_THRESHOLDS.BM_SPEED,
  ],
  ["TdM", (c) => c.peakClassical >= TITLE_THRESHOLDS.TDM_CLASSICAL],
  [
    "PM",
    (c) =>
      c.puzzlePercentileCutoff > 0 &&
      c.puzzlesSolved >= TITLE_THRESHOLDS.PM_MIN_SOLVED &&
      c.puzzlePeak >= c.puzzlePercentileCutoff,
  ],
  [
    "EM",
    (c) =>
      c.endgameGames >= TITLE_THRESHOLDS.EM_MIN_GAMES &&
      c.endgameWins / c.endgameGames >= TITLE_THRESHOLDS.EM_WIN_RATE,
  ],
  ["TM", (c) => c.tournamentWins >= TITLE_THRESHOLDS.TM_WINS],
];

/**
 * The automatic title a player has earned.
 *
 * @param criteria - Partial criteria; anything omitted counts as zero, so
 *   callers need only supply the fields they track.
 * @returns The highest-precedence title earned, or null.
 */
export function computeAutoTitle(criteria: Partial<TitleCriteria>): AutoTitle | null {
  const c: TitleCriteria = { ...EMPTY_CRITERIA, ...criteria };
  for (const [title, earned] of AUTO_TITLE_RULES) {
    if (earned(c)) return title;
  }
  return null;
}

/** Every automatic title a player qualifies for, for a profile's earned list. */
export function computeEarnedAutoTitles(criteria: Partial<TitleCriteria>): AutoTitle[] {
  const c: TitleCriteria = { ...EMPTY_CRITERIA, ...criteria };
  return AUTO_TITLE_RULES.filter(([, earned]) => earned(c)).map(([title]) => title);
}

// ── Resolution ──────────────────────────────────────────────

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
 * masks an automatic one. Nothing is destroyed -- lifting a ban or clearing a
 * manual title reveals whatever sits underneath.
 *
 * Must be applied server-side before serialization. The web app is a PWA with
 * aggressive caching, so a title that reaches the client survives in the cache
 * and in the offline shell regardless of what components do with it.
 */
export function resolveTitle(state: TitleState | null | undefined): Title | null {
  if (!state) return null;
  if (state.titleBanned) return null;
  return state.titleManual ?? state.titleAuto ?? null;
}
