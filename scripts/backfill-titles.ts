/**
 * Backfill peak ratings and auto titles.
 *
 * The migration already does this once at deploy time. This script exists for
 * the cases the migration cannot cover:
 *
 *   - Re-syncing after a manual database edit or a restore from backup.
 *   - Recomputing after changing AUTO_TITLE_THRESHOLDS.
 *
 * Users with `titleAutoLocked` set are skipped — their auto title was set by
 * hand and this script must not clobber it. Manual titles are never touched.
 *
 * Usage, from the repo root:
 *   docker compose -f deployment/docker-compose.yml exec api \
 *     npx tsx scripts/backfill-titles.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";
import { computeAutoTitle } from "@eyeonchess/chess";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      rating: true,
      peakRating: true,
      titleAuto: true,
      titleAutoLocked: true,
    },
  });

  let peakFixed = 0;
  let titleChanged = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.titleAutoLocked) {
      skipped++;
      continue;
    }

    const peak = Math.max(user.rating, user.peakRating);
    const earned = computeAutoTitle(peak);

    const data: { peakRating?: number; titleAuto?: "AM" | "UM" | null } = {};
    if (peak > user.peakRating) {
      data.peakRating = peak;
      peakFixed++;
    }
    if (earned !== user.titleAuto) {
      data.titleAuto = earned;
      titleChanged++;
      console.log(
        `  ${user.username}: ${user.titleAuto ?? "none"} -> ${earned ?? "none"} (peak ${peak})`
      );
    }

    if (Object.keys(data).length > 0 && !dryRun) {
      await prisma.user.update({ where: { id: user.id }, data });
    }
  }

  console.log(
    `\n${dryRun ? "[dry run] " : ""}${users.length} users scanned · ` +
      `${peakFixed} peak ratings corrected · ${titleChanged} titles changed · ` +
      `${skipped} skipped (auto title overridden)`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
