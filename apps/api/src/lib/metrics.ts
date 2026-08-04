import client from "prom-client";
import { prisma } from "./prisma.js";
import { redis } from "./redis.js";
import { logger } from "./logger.js";

/**
 * Custom application metrics for Prometheus.
 * Exposed alongside default HTTP metrics at /metrics.
 */

export const activeGames = new client.Gauge({
  name: "eyeonchess_active_games",
  help: "Number of currently active games",
});

export const analysisQueueDepth = new client.Gauge({
  name: "eyeonchess_analysis_queue_depth",
  help: "Number of jobs in the analysis queue",
});

export const totalUsers = new client.Gauge({
  name: "eyeonchess_total_users",
  help: "Total registered users",
});

export const gamesCompletedTotal = new client.Counter({
  name: "eyeonchess_games_completed_total",
  help: "Total number of completed games",
});

export const websocketConnections = new client.Gauge({
  name: "eyeonchess_websocket_connections",
  help: "Number of active WebSocket connections",
});

export const moveValidationFailures = new client.Counter({
  name: "eyeonchess_move_validation_failures_total",
  help: "Total move validation failures (illegal moves submitted)",
});

export const gameTimeouts = new client.Counter({
  name: "eyeonchess_game_timeouts_total",
  help: "Total games ended by clock timeout",
});

let lastCompletedCount = 0;

/**
 * Update all custom gauges by querying the database and Redis.
 * Called periodically from the server.
 */
export async function updateMetrics() {
  try {
    const [users, active, queueLen, completed] = await Promise.all([
      prisma.user.count(),
      prisma.game.count({ where: { status: "ACTIVE" } }),
      redis.llen("analysis:queue"),
      prisma.game.count({ where: { status: "COMPLETED" } }),
    ]);

    totalUsers.set(users);
    activeGames.set(active);
    analysisQueueDepth.set(queueLen);

    // Increment counter by the delta since last check
    if (completed > lastCompletedCount) {
      gamesCompletedTotal.inc(completed - lastCompletedCount);
    }
    lastCompletedCount = completed;
  } catch (err) {
    logger.warn({ err }, "metrics update failed");
  }
}
