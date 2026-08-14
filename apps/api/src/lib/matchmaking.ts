import type { Server as SocketServer, Socket } from "socket.io";
import { prisma } from "./prisma.js";
import { initClocks } from "./gameClock.js";
import { logger } from "./logger.js";
import { capabilitiesForUser } from "./gameChat.js";

/**
 * Random-opponent matchmaking.
 *
 * Held in process memory rather than Redis on purpose: the API runs as a single
 * instance, a queue entry is worthless the moment the socket drops, and a
 * player who reconnects should re-queue rather than be paired into a game they
 * are not watching. If the API is ever scaled horizontally this must move to
 * Redis — the queue would otherwise fragment per instance and two players on
 * different instances would never find each other.
 */

export interface QueueEntry {
  userId: string;
  socketId: string;
  rating: number;
  minutes: number;
  increment: number;
  joinedAt: number;
}

/** Keyed by "minutes+increment" so only identical time controls pair. */
const queues = new Map<string, QueueEntry[]>();

/** Rating window opens over time so a lone strong player is not stuck forever. */
const INITIAL_WINDOW = 200;
const WINDOW_GROWTH_PER_SECOND = 25;
const MAX_WINDOW = 1200;

function key(minutes: number, increment: number) {
  return `${minutes}+${increment}`;
}

function windowFor(entry: QueueEntry, now: number): number {
  const waited = (now - entry.joinedAt) / 1000;
  return Math.min(MAX_WINDOW, INITIAL_WINDOW + waited * WINDOW_GROWTH_PER_SECOND);
}

/** Time-control category, matching the rating pools. */
function categorise(minutes: number, increment: number) {
  const estimate = minutes * 60 + increment * 40;
  if (estimate < 179) return "BULLET" as const;
  if (estimate < 479) return "BLITZ" as const;
  if (estimate < 1499) return "RAPID" as const;
  return "CLASSICAL" as const;
}

export function removeFromQueue(socketId: string): void {
  for (const [k, list] of queues) {
    const idx = list.findIndex((e) => e.socketId === socketId);
    if (idx !== -1) {
      list.splice(idx, 1);
      if (list.length === 0) queues.delete(k);
      return;
    }
  }
}

/** Number of players currently waiting, for the queue UI. */
export function queueSize(minutes: number, increment: number): number {
  return queues.get(key(minutes, increment))?.length ?? 0;
}

/**
 * Waiting players per time control, for the play screen.
 *
 * Only non-empty entries are returned: a count of zero is noise, and the UI
 * shows nothing rather than "0 waiting" beside every tile.
 */
export function queueCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, list] of queues) {
    if (list.length > 0) out[k] = list.length;
  }
  return out;
}

/**
 * Add a player to the queue and pair them if a suitable opponent is waiting.
 *
 * Pairs with the *closest-rated* eligible opponent rather than the
 * longest-waiting one, then falls back on wait time through the widening
 * window — closest-rated alone would starve outliers.
 */
export async function joinQueue(
  io: SocketServer,
  socket: Socket,
  userId: string,
  opts: { minutes: number; increment: number }
): Promise<void> {
  const minutes = Math.max(1, Math.min(180, Math.floor(opts.minutes)));
  const increment = Math.max(0, Math.min(60, Math.floor(opts.increment)));

  // One queue entry per player, however many tabs they have open.
  removeFromQueue(socket.id);
  for (const list of queues.values()) {
    const idx = list.findIndex((e) => e.userId === userId);
    if (idx !== -1) list.splice(idx, 1);
  }

  // Socket events do not pass through the HTTP capability hook, so a
  // restricted or suspended player could otherwise queue for a public game
  // despite that being the exact thing those punishments remove.
  const caps = await capabilitiesForUser(userId);
  if (!caps.playPublic) {
    socket.emit("queue:error", {
      message: "A moderation action on your account prevents public matchmaking.",
      standingPath: "/standing",
    });
    return;
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { rating: true },
  });
  if (!me) return;

  const k = key(minutes, increment);
  const list = queues.get(k) ?? [];
  const now = Date.now();

  const entry: QueueEntry = {
    userId,
    socketId: socket.id,
    rating: me.rating,
    minutes,
    increment,
    joinedAt: now,
  };

  const eligible = list
    .filter((other) => other.userId !== userId)
    .filter((other) => {
      const gap = Math.abs(other.rating - entry.rating);
      // Either side's window qualifying is enough — otherwise the player who
      // just arrived would gate a match for someone who has waited minutes.
      return gap <= windowFor(other, now) || gap <= windowFor(entry, now);
    })
    .sort((a, b) => Math.abs(a.rating - entry.rating) - Math.abs(b.rating - entry.rating));

  const opponent = eligible[0];

  if (!opponent) {
    list.push(entry);
    queues.set(k, list);
    socket.emit("queue:waiting", { position: list.length, size: list.length });
    return;
  }

  // Pair them.
  list.splice(list.indexOf(opponent), 1);
  if (list.length === 0) queues.delete(k);

  // Colour by coin flip. Alternating by rating would let players farm a colour.
  const whiteFirst = Math.random() < 0.5;
  const initialTime = minutes * 60;

  try {
    const game = await prisma.game.create({
      data: {
        whiteId: whiteFirst ? userId : opponent.userId,
        blackId: whiteFirst ? opponent.userId : userId,
        status: "ACTIVE",
        timeControl: categorise(minutes, increment),
        initialTime,
        increment,
        whiteTimeLeft: initialTime * 1000,
        blackTimeLeft: initialTime * 1000,
        startedAt: new Date(),
      },
    });

    if (game.timeControl !== "UNLIMITED") {
      await initClocks(game.id, initialTime * 1000, increment * 1000);
    }

    io.to(socket.id).emit("queue:matched", { gameId: game.id });
    io.to(opponent.socketId).emit("queue:matched", { gameId: game.id });

    logger.info(
      { gameId: game.id, a: userId, b: opponent.userId, tc: k },
      "matchmaking paired players"
    );
  } catch (err) {
    logger.error({ err }, "matchmaking failed to create game");
    // Put the opponent back rather than silently dropping them.
    const restored = queues.get(k) ?? [];
    restored.push(opponent);
    queues.set(k, restored);
    socket.emit("queue:error", { message: "Could not start the game. Try again." });
  }
}

/** Register the matchmaking events on a connected socket. */
export function registerQueueHandlers(io: SocketServer, socket: Socket, userId: string): void {
  socket.on("queue:join", async (data: { minutes?: number; increment?: number }) => {
    await joinQueue(io, socket, userId, {
      minutes: Number(data?.minutes ?? 5),
      increment: Number(data?.increment ?? 3),
    });
  });

  socket.on("queue:counts", () => {
    socket.emit("queue:counts", queueCounts());
  });

  socket.on("queue:leave", () => {
    removeFromQueue(socket.id);
    socket.emit("queue:left");
  });

  socket.on("disconnect", () => removeFromQueue(socket.id));
}
