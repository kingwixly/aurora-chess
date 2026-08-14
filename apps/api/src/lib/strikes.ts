import { prisma } from "./prisma.js";
import { logger } from "./logger.js";
import { updatePeakAndAutoTitle } from "./titles.js";

/**
 * Convert expired punishments into strikes.
 *
 * Without this the ladder silently stops working: `becameStrikeAt` is what the
 * twelve-month window is measured from, so a punishment that expires and is
 * never converted counts as a strike forever. A permanent penalty is exactly
 * what the window exists to prevent.
 *
 * Also recomputes titles for anyone whose block has just lapsed. Otherwise a
 * player sits at 2500 with no Aurora Master and no explanation until they
 * happen to finish another rated game.
 */
export async function materialiseStrikes(): Promise<{ converted: number; retitled: number }> {
  const now = new Date();
  let converted = 0;
  let retitled = 0;

  try {
    const expired = await prisma.punishment.findMany({
      where: {
        type: { not: "BAN" },
        becameStrikeAt: null,
        overturnedAt: null,
        expiresAt: { not: null, lte: now },
      },
      select: { id: true, userId: true },
    });

    for (const p of expired) {
      await prisma.punishment.update({
        where: { id: p.id },
        data: { becameStrikeAt: p.userId ? now : now },
      });
      converted++;
    }

    // Anyone whose newest counting strike has just passed the window.
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 12);

    const candidates = await prisma.user.findMany({
      where: {
        punishments: {
          some: { becameStrikeAt: { not: null, lt: cutoff }, overturnedAt: null },
        },
      },
      select: { id: true, rating: true, titleAutoLocked: true },
      take: 500,
    });

    for (const user of candidates) {
      if (user.titleAutoLocked) continue;
      const stillBlocked = await prisma.punishment.count({
        where: {
          userId: user.id,
          type: { not: "BAN" },
          overturnedAt: null,
          OR: [
            { becameStrikeAt: { gte: cutoff } },
            { expiresAt: null, becameStrikeAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      });
      if (stillBlocked > 0) continue;

      await updatePeakAndAutoTitle(user.id, user.rating);
      retitled++;
    }
  } catch (err) {
    logger.error({ err }, "strike materialisation failed");
  }

  return { converted, retitled };
}

/** Run hourly. Cheap at this scale, and a lapsed block should not wait a day. */
export function startStrikeJob(): NodeJS.Timeout {
  const run = () =>
    materialiseStrikes()
      .then(({ converted, retitled }) => {
        if (converted || retitled) {
          logger.info({ converted, retitled }, "strikes materialised");
        }
      })
      .catch(() => {});
  void run();
  return setInterval(run, 60 * 60 * 1000);
}
