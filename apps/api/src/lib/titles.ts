import {
  computeAutoTitle,
  resolveTitle,
  resolveBadges,
  type Title,
  type ManualTitle,
  type AutoTitle,
  type HeldBadge,
} from "@aurora/chess";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

/** Key under which the PM percentile cutoff is stored in `SiteStat`. */
export const PUZZLE_CUTOFF_KEY = "puzzle_percentile_cutoff";

/**
 * Prisma select fragment for the title fields.
 *
 * Spread into any `select` whose result is handed to {@link withTitle}, so that
 * adding a future title field does not mean touching every call site again.
 */
export const TITLE_SELECT = {
  titleManual: true,
  titleAuto: true,
  titleBanned: true,
  modShield: true,
  // Rendered before the shield and title wherever a name appears, so it
  // belongs in the standard select rather than only on the profile.
  fideVerified: true,
  activeFlair: true,
  staffRank: true,
  role: true,
  countryCode: true,
} as const;

/**
 * Standard select for a user rendered anywhere in the UI.
 *
 * Use this rather than hand-writing `{ id, username, rating, avatarUrl }`, so a
 * new endpoint cannot silently omit the title fields.
 */
export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  rating: true,
  avatarUrl: true,
  ...TITLE_SELECT,
} as const;

interface TitleFields {
  titleManual?: ManualTitle | null;
  titleAuto?: AutoTitle | null;
  titleBanned?: boolean;
  modShield?: boolean;
}

type Serialized<T extends TitleFields> = Omit<T, "titleManual" | "titleAuto" | "titleBanned"> & {
  title: Title | null;
  modShield: boolean;
};

/**
 * Collapse the raw title columns into a single `title` for the wire.
 *
 * This is the enforcement point for title bans. The raw columns must never
 * reach a client: the web app is a PWA with aggressive caching, so anything
 * serialized survives in the cache and the offline shell no matter what the
 * components do with it.
 */
export function withTitle<T extends TitleFields>(user: T): Serialized<T> {
  const { titleManual: _m, titleAuto: _a, titleBanned: _b, ...rest } = user;
  return {
    ...rest,
    title: resolveTitle(user),
    modShield: user.modShield ?? false,
    fideVerified: user.fideVerified ?? false,
    // Derived from role when no custom label is set, so an admin gets the mark
    // without a second manual step. Explicitly clearing it is still possible by
    // setting an empty string, which is why "" is not treated as unset.
    staffRank:
      user.staffRank !== undefined && user.staffRank !== null
        ? user.staffRank || null
        : user.role === "ADMIN"
          ? "Admin"
          : null,
  } as Serialized<T>;
}

/** Null-tolerant {@link withTitle}, for optional relations like `game.white`. */
export function withTitleOrNull<T extends TitleFields>(
  user: T | null | undefined
): Serialized<T> | null {
  return user ? withTitle(user) : null;
}

/** Map {@link withTitle} over a list. */
export function withTitles<T extends TitleFields>(users: T[]): Serialized<T>[] {
  return users.map(withTitle);
}

/** Shape a user's badges for a profile response. Profile only — never lists. */
export function serializeBadges(held: readonly HeldBadge[]) {
  // `evidence` is deliberately not carried through: it can contain a FIDE ID or
  // a federation reference, which is staff-visible only.
  return resolveBadges(held).map((b) => ({
    key: b.key,
    label: b.label,
    description: b.description,
    icon: b.icon,
    category: b.category,
    pinned: b.pinned,
    grantedAt: b.grantedAt,
  }));
}

/**
 * The current PM cutoff, or 0 if none has been computed.
 *
 * Zero disables PM rather than granting it universally — on a small population
 * a 95th percentile is noise.
 */
async function getPuzzleCutoff(): Promise<number> {
  const row = await prisma.siteStat.findUnique({ where: { key: PUZZLE_CUTOFF_KEY } });
  return row?.value ?? 0;
}

/**
 * Recompute the PM percentile cutoff across all eligible solvers.
 *
 * Run on a schedule, not per request. Requires a minimum population before it
 * will produce a non-zero cutoff, because a percentile over a handful of
 * solvers says nothing.
 *
 * @param minPopulation - Eligible solvers required before PM is enabled.
 */
export async function recomputePuzzleCutoff(minPopulation = 20): Promise<number> {
  const eligible = await prisma.user.findMany({
    where: { puzzlesSolved: { gte: 200 } },
    select: { puzzlePeak: true },
    orderBy: { puzzlePeak: "asc" },
  });

  let cutoff = 0;
  if (eligible.length >= minPopulation) {
    const index = Math.floor(eligible.length * 0.95);
    cutoff = eligible[Math.min(index, eligible.length - 1)]!.puzzlePeak;
  }

  await prisma.siteStat.upsert({
    where: { key: PUZZLE_CUTOFF_KEY },
    create: { key: PUZZLE_CUTOFF_KEY, value: cutoff },
    update: { value: cutoff },
  });

  logger.info({ cutoff, population: eligible.length }, "recomputed puzzle percentile cutoff");
  return cutoff;
}

/**
 * Update a player's peak ratings and, if warranted, their automatic title.
 *
 * Reads every criterion the automatic titles depend on — the per-time-control
 * pools, puzzle stats, endgame record and tournament wins — rather than only
 * the pooled rating, so specialist titles can actually be earned during play.
 *
 * No-op for users whose automatic title staff have locked, so a hand-assigned
 * title survives the player's next game.
 *
 * Failures are logged and swallowed: a title is cosmetic, and a broken title
 * write must not roll back a completed game's rating update.
 */
export async function updatePeakAndAutoTitle(userId: string, newRating: number): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        peakRating: true,
        titleAuto: true,
        titleAutoLocked: true,
        puzzlePeak: true,
        puzzlesSolved: true,
        endgameWins: true,
        endgameGames: true,
        tournamentWins: true,
        ratings: { select: { timeControl: true, peak: true } },
      },
    });
    if (!user) return;

    const data: { peakRating?: number; titleAuto?: AutoTitle | null } = {};
    if (newRating > user.peakRating) data.peakRating = newRating;

    if (!user.titleAutoLocked) {
      const peakFor = (tc: string) => user.ratings.find((r) => r.timeControl === tc)?.peak ?? 0;

      const earned = computeAutoTitle({
        peakOverall: Math.max(newRating, user.peakRating),
        peakBullet: peakFor("BULLET"),
        peakBlitz: peakFor("BLITZ"),
        peakClassical: peakFor("CLASSICAL"),
        puzzlePeak: user.puzzlePeak,
        puzzlesSolved: user.puzzlesSolved,
        puzzlePercentileCutoff: await getPuzzleCutoff(),
        endgameWins: user.endgameWins,
        endgameGames: user.endgameGames,
        tournamentWins: user.tournamentWins,
      });

      if (earned !== user.titleAuto) data.titleAuto = earned;
    }

    if (Object.keys(data).length === 0) return;
    await prisma.user.update({ where: { id: userId }, data });

    if (data.titleAuto) {
      logger.info({ userId, title: data.titleAuto }, "automatic title awarded");
    }
  } catch (err) {
    logger.error({ err, userId }, "failed to update peak rating / automatic title");
  }
}

/**
 * Apply a rated result to a player's per-time-control pool.
 *
 * Kept separate from {@link updatePeakAndAutoTitle} so the pool write happens
 * before the title recompute reads it — otherwise a player crossing 2200 in
 * blitz would not receive BM until their *next* game.
 */
export async function updatePoolRating(
  userId: string,
  timeControl: "BULLET" | "BLITZ" | "RAPID" | "CLASSICAL" | "UNLIMITED",
  newRating: number,
  result: "win" | "loss" | "draw"
): Promise<void> {
  try {
    await prisma.userRating.upsert({
      where: { userId_timeControl: { userId, timeControl } },
      create: {
        userId,
        timeControl,
        rating: newRating,
        peak: newRating,
        games: 1,
        wins: result === "win" ? 1 : 0,
        losses: result === "loss" ? 1 : 0,
        draws: result === "draw" ? 1 : 0,
      },
      update: {
        rating: newRating,
        peak: { set: undefined },
        games: { increment: 1 },
        wins: { increment: result === "win" ? 1 : 0 },
        losses: { increment: result === "loss" ? 1 : 0 },
        draws: { increment: result === "draw" ? 1 : 0 },
      },
    });

    // Peak only ever rises. Prisma has no "greatest" update primitive, so this
    // is a second, conditional write rather than part of the upsert above.
    await prisma.userRating.updateMany({
      where: { userId, timeControl, peak: { lt: newRating } },
      data: { peak: newRating },
    });
  } catch (err) {
    logger.error({ err, userId, timeControl }, "failed to update pool rating");
  }
}

/**
 * Serialize the player relations on a game row.
 *
 * Games are returned from half a dozen routes in slightly different shapes, and
 * hand-editing each one is how a title ends up missing from exactly one screen.
 * This takes any object with `white`/`black` relations and returns it with both
 * serialized, leaving everything else untouched.
 */
export function withGamePlayers<T extends { white?: unknown; black?: unknown }>(game: T): T {
  if (!game) return game;
  return {
    ...game,
    white: withTitleOrNull(game.white as never),
    black: withTitleOrNull(game.black as never),
  };
}

/** Map {@link withGamePlayers} over a list of games. */
export function withGamesPlayers<T extends { white?: unknown; black?: unknown }>(games: T[]): T[] {
  return games.map(withGamePlayers);
}
