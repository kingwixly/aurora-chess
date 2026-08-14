import type { FastifyInstance } from "fastify";
import type { Server as SocketServer } from "socket.io";
import { prisma } from "./prisma.js";
import { redis } from "./redis.js";
import { destroyBotEngine } from "./botEngine.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Gracefully shut down the server by closing connections in order:
 * 1. Stop accepting new HTTP connections (Fastify close)
 * 2. Disconnect Socket.io clients
 * 3. Kill Stockfish child processes
 * 4. Disconnect Prisma (drain DB pool)
 * 5. Disconnect Redis
 * 6. Exit process
 *
 * Force exits after 10 seconds if cleanup hangs.
 *
 * @param fastify - The Fastify server instance.
 * @param io - The Socket.io server instance (optional).
 * @param logger - Logger for shutdown messages.
 * @param intervals - Interval IDs to clear on shutdown.
 */
export function registerShutdown(
  fastify: FastifyInstance,
  io?: SocketServer | null,
  logger?: { info: (msg: string) => void; error: (msg: string) => void },
  intervals?: NodeJS.Timeout[]
) {
  const log = logger || { info: console.log, error: console.error };
  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    log.info(`Received ${signal}. Starting graceful shutdown...`);

    // Force exit after timeout
    const forceTimer = setTimeout(() => {
      log.error("Shutdown timed out. Forcing exit.");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    try {
      // 1. Clear periodic intervals
      if (intervals) {
        for (const id of intervals) clearInterval(id);
        log.info(`Cleared ${intervals.length} interval(s)`);
      }

      // 2. Close Fastify (stops accepting, drains in-flight)
      await fastify.close();
      log.info("Fastify closed");

      // 3. Close Socket.io
      if (io) {
        await new Promise<void>((resolve) => {
          io.close(() => resolve());
        });
        log.info("Socket.io closed");
      }

      // 4. Kill Stockfish processes
      destroyBotEngine();
      log.info("Stockfish engines destroyed");

      // 5. Disconnect Prisma
      await prisma.$disconnect();
      log.info("Prisma disconnected");

      // 6. Disconnect Redis
      await redis.quit();
      log.info("Redis disconnected");

      log.info("Graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      log.error(`Shutdown error: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
