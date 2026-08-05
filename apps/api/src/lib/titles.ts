import {
  computeAutoTitle,
  resolveTitle,
  type Title,
  type ManualTitle,
  type AutoTitle,
} from "@eyeonchess/chess";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

/**
 * Prisma select fragment for the title fields.
 *
 * Spread this into any `select` whose result will be handed to
 * {@link withTitle}. Keeping it in one place means adding a future title field
 * does not require touching every call site again.
 */
export const TITLE_SELECT = {
  titleManual: true,
  titleAuto: true,
  titleBanned: true,
} as const;

/**
 * Standard select for a user rendered anywhere in the UI.
 *
 * Use this instead of hand-writing `{ id, username, rating, avatarUrl }`, so
 * that title fields cannot be accidentally omitted from a new endpoint.
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
}

/**
 * Collapse the raw title columns into a single `title` field for the wire.
 *
 * This is the enforcement point for title bans. The raw columns must never
 * reach a client: the web app is a PWA with aggressive caching, so anything
 * serialized survives in the cache and in the offline shell no matter what the
 * React components do with it.
 *
 * @param user - A user object selected with {@link PUBLIC_USER_SELECT}.
 * @returns The same object with title columns replaced by a resolved `title`.
 */
export function withTitle<T extends TitleFields>(
  user: T
): Omit<T, "titleManual" | "titleAuto" | "titleBanned"> & { title: Title | null } {
  const { titleManual: _m, titleAuto: _a, titleBanned: _b, ...rest } = user;
  return { ...rest, title: resolveTitle(user) };
}

/** Null-tolerant {@link withTitle}, for optional relations like `game.white`. */
export function withTitleOrNull<T extends TitleFields>(
  user: T | null | undefined
): (Omit<T, "titleManual" | "titleAuto" | "titleBanned"> & { title: Title | null }) | null {
  return user ? withTitle(user) : null;
}

/** Map {@link withTitle} over a list. */
export function withTitles<T extends TitleFields>(users: T[]) {
  return users.map(withTitle);
}

/**
 * Update a player's peak rating and, if warranted, their auto title.
 *
 * Auto titles are sticky and keyed off peak rating, so this only ever moves a
 * title upward. It is a no-op for users whose auto title has been locked by
 * staff, so a hand-assigned AM survives the player's next game.
 *
 * Failures are logged and swallowed: a title is cosmetic, and a broken title
 * write must not roll back a completed game's rating update.
 *
 * @param userId - The player whose rating just changed.
 * @param newRating - The rating just written to their row.
 */
export async function updatePeakAndAutoTitle(userId: string, newRating: number): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { peakRating: true, titleAuto: true, titleAutoLocked: true },
    });
    if (!user) return;

    const data: { peakRating?: number; titleAuto?: "AM" | "UM" | null } = {};

    if (newRating > user.peakRating) {
      data.peakRating = newRating;
    }

    if (!user.titleAutoLocked) {
      const peak = Math.max(newRating, user.peakRating);
      const earned = computeAutoTitle(peak);
      if (earned !== user.titleAuto) {
        data.titleAuto = earned;
      }
    }

    if (Object.keys(data).length === 0) return;

    await prisma.user.update({ where: { id: userId }, data });

    if (data.titleAuto) {
      logger.info(
        { userId, title: data.titleAuto, peak: data.peakRating ?? user.peakRating },
        "auto title awarded"
      );
    }
  } catch (err) {
    logger.error({ err, userId }, "failed to update peak rating / auto title");
  }
}
