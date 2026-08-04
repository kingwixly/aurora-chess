import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

/**
 * Register the public bot listing endpoint.
 * Serves bot personalities from the database.
 * No authentication is required for this route.
 */
export async function botRoutes(app: FastifyInstance) {
  app.get("/bots", async () => {
    const dbBots = await prisma.botProfile.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    });

    return {
      bots: dbBots.map((b) => ({
        id: b.botId,
        name: b.name,
        elo: b.elo,
        description: b.description,
        avatar: b.avatar,
        tier: b.tier,
        category: b.category,
        randomMoveChance: b.randomMoveChance,
        blunderChance: b.blunderChance,
        captureGreed: b.captureGreed,
        aggressionBias: b.aggressionBias,
        maxDepth: b.maxDepth,
        queenEarly: b.queenEarly,
        pawnPusher: b.pawnPusher,
        messages: b.messages ?? undefined,
        preferredOpenings: b.preferredOpenings ?? undefined,
      })),
    };
  });
}
