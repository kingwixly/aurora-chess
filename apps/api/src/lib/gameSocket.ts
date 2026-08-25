import { Server as SocketServer, Socket } from "socket.io";
import { Chess } from "chess.js";
import { prisma } from "./prisma.js";
import { registerQueueHandlers } from "./matchmaking.js";
import { screenGame } from "./screening.js";
import { capabilitiesForUser, checkChatRateLimit } from "./gameChat.js";
import { computeElo } from "./elo.js";
import {
  updatePeakAndAutoTitle,
  updatePoolRating,
  PUBLIC_USER_SELECT,
  withTitle,
  withTitleOrNull,
} from "./titles.js";
import { redis, checkReactionRateLimit } from "./redis.js";
import { logger } from "./logger.js";
import { moveValidationFailures, gameTimeouts } from "./metrics.js";
import { VALID_REACTIONS, type GameResult, type Termination } from "@aurora/chess";
import {
  initClocks,
  getClocksRealtime,
  onMove as clockOnMove,
  isTimeout,
  removeActiveGame,
  getActiveGameIds,
} from "./gameClock.js";

async function getFullGameState(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      white: { select: PUBLIC_USER_SELECT },
      black: { select: PUBLIC_USER_SELECT },
      moves: { orderBy: { ply: "asc" } },
    },
  });
  if (!game) return null;

  const clocks = await getClocksRealtime(gameId);
  return {
    game: { ...game, white: withTitleOrNull(game.white), black: withTitleOrNull(game.black) },
    clocks,
  };
}

// Track draw offers: gameId -> offeringUserId (module-level so endGame can clean up)
const drawOffers = new Map<string, string>();

async function endGame(
  io: SocketServer,
  gameId: string,
  result: GameResult,
  termination: Termination
) {
  drawOffers.delete(gameId);

  const game = await prisma.game.update({
    where: { id: gameId },
    data: {
      status: result === "ABORTED" ? "ABORTED" : "COMPLETED",
      result,
      termination,
      endedAt: new Date(),
    },
    include: {
      // deviation and volatility are needed for the Glicko-2 update; without
      // them every game would be scored as if both players were brand new.
      white: { select: { id: true, rating: true, deviation: true, volatility: true } },
      black: { select: { id: true, rating: true, deviation: true, volatility: true } },
    },
  });

  let ratingChange = { white: 0, black: 0 };

  if (result !== "ABORTED" && game.white && game.black && !game.isVsBot) {
    const {
      newWhiteRating,
      newBlackRating,
      whiteDeviation,
      blackDeviation,
      whiteVolatility,
      blackVolatility,
    } = computeElo(game.white.rating, game.black.rating, result, game.white, game.black);
    ratingChange = {
      white: newWhiteRating - game.white.rating,
      black: newBlackRating - game.black.rating,
    };
    await prisma.user.update({
      where: { id: game.white.id },
      data: {
        rating: newWhiteRating,
        deviation: whiteDeviation,
        volatility: whiteVolatility,
      },
    });
    await prisma.user.update({
      where: { id: game.black.id },
      data: {
        rating: newBlackRating,
        deviation: blackDeviation,
        volatility: blackVolatility,
      },
    });

    // Pool ratings must be written BEFORE the title recompute reads them,
    // otherwise a player crossing 2200 in blitz would not receive BM until
    // their next game. Bot games never reach here (guarded by !game.isVsBot
    // above), so automatic titles cannot be farmed against Stockfish.
    // Same two-notation problem as the rating update: resignations and
    // timeouts arrive as WHITE_WIN/BLACK_WIN, so matching only on PGN recorded
    // every resignation as a draw in the per-pool win counters.
    const normalised = result.trim().toUpperCase();
    const whiteWon = normalised === "1-0" || normalised === "WHITE_WIN";
    const blackWon = normalised === "0-1" || normalised === "BLACK_WIN";
    const whiteResult = whiteWon ? "win" : blackWon ? "loss" : "draw";
    const blackResult = blackWon ? "win" : whiteWon ? "loss" : "draw";

    await Promise.all([
      updatePoolRating(game.white.id, game.timeControl, newWhiteRating, whiteResult),
      updatePoolRating(game.black.id, game.timeControl, newBlackRating, blackResult),
    ]);
    await Promise.all([
      updatePeakAndAutoTitle(game.white.id, newWhiteRating),
      updatePeakAndAutoTitle(game.black.id, newBlackRating),
    ]);

    // Automated review runs here and can only ever open a report for a human.
    // Nothing in this path punishes anyone.
    void screenGame(gameId);
  }

  await removeActiveGame(gameId);

  io.to(`game:${gameId}`).emit("game:over", {
    result,
    termination,
    ratingChange,
  });
}

/**
 * Register all game-related socket event handlers (moves, resign, draw, rematch, reactions).
 * @param io - The Socket.IO server instance.
 */
export function setupGameSocket(io: SocketServer) {
  /** Wrap an async socket handler with error logging to prevent unhandled rejections. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function safe<T extends (...args: any[]) => Promise<void>>(event: string, handler: T): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (async (...args: any[]) => {
      try {
        await handler(...args);
      } catch (err) {
        logger.error({ err, event }, "socket handler error");
      }
    }) as T;
  }

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;

    // A room per person, so a challenge can be delivered to ONE user.
    // Challenge notifications were sent with io.emit, which broadcasts to every
    // connected client — so everyone on the site saw every challenge, complete
    // with the game id.
    if (userId) socket.join(`user:${userId}`);

    // Random-opponent matchmaking.
    registerQueueHandlers(io, socket, userId);

    /**
     * In-game chat.
     *
     * Rate-limited hard and capped short: nobody needs more than a few words
     * mid-game, and the volume limit is what stops chat becoming a channel for
     * pressuring an opponent on the clock.
     */
    socket.on("game:chat", async (data: { gameId?: string; body?: string }) => {
      try {
        const gameId = data?.gameId;
        const body = (data?.body ?? "").trim().slice(0, 200);
        if (!gameId || !body) return;

        // Chat is removed by a restriction or above, so it is checked here
        // rather than trusted from the client.
        const caps = await capabilitiesForUser(userId);
        if (!caps.chat) {
          socket.emit("game:chat:denied", {
            reason: "A moderation action on your account prevents chat.",
          });
          return;
        }

        const game = await prisma.game.findFirst({
          where: { id: gameId, OR: [{ whiteId: userId }, { blackId: userId }] },
          select: { id: true },
        });
        if (!game) return;

        if (!(await checkChatRateLimit(userId))) {
          socket.emit("game:chat:denied", { reason: "Slow down." });
          return;
        }

        const author = await prisma.user.findUnique({
          where: { id: userId },
          select: PUBLIC_USER_SELECT,
        });

        const message = await prisma.gameChatMessage.create({
          data: { gameId, authorId: userId, body },
          select: { id: true, body: true, createdAt: true },
        });

        io.to(`game:${gameId}`).emit("game:chat", {
          ...message,
          author: author ? withTitle(author) : null,
        });
      } catch (err) {
        logger.warn({ err, userId }, "game chat failed");
      }
    });

    // Join game room
    socket.on(
      "game:join",
      safe("game:join", async (gameId: string) => {
        socket.join(`game:${gameId}`);

        const state = await getFullGameState(gameId);
        if (state) {
          socket.emit("game:state", state);
        }
      })
    );

    // Make a move
    socket.on("game:move", (data) => processMove(io, socket, userId, drawOffers, data));

    // Resign
    socket.on(
      "game:resign",
      safe("game:resign", async (gameId: string) => {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game || game.status !== "ACTIVE") return;

        const result = game.whiteId === userId ? "BLACK_WIN" : "WHITE_WIN";
        await endGame(io, gameId, result, "RESIGNATION");
      })
    );

    // Draw offer
    socket.on(
      "game:draw:offer",
      safe("game:draw:offer", async (gameId: string) => {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game || game.status !== "ACTIVE") return;

        drawOffers.set(gameId, userId);
        socket.to(`game:${gameId}`).emit("game:draw:offered", { by: userId });
      })
    );

    // Accept draw
    socket.on(
      "game:draw:accept",
      safe("game:draw:accept", async (gameId: string) => {
        const offerer = drawOffers.get(gameId);
        if (!offerer || offerer === userId) return;

        drawOffers.delete(gameId);
        await endGame(io, gameId, "DRAW", "AGREEMENT");
      })
    );

    // Decline draw
    socket.on(
      "game:draw:decline",
      safe("game:draw:decline", async (gameId: string) => {
        drawOffers.delete(gameId);
        socket.to(`game:${gameId}`).emit("game:draw:declined");
      })
    );

    // Emoji reaction
    socket.on(
      "game:reaction",
      safe("game:reaction", async (data: { gameId: string; reaction: string }) => {
        const { gameId, reaction } = data;

        if (!VALID_REACTIONS.includes(reaction as (typeof VALID_REACTIONS)[number])) return;

        const game = await prisma.game.findUnique({
          where: { id: gameId },
          select: { whiteId: true, blackId: true, status: true },
        });
        if (!game || game.status !== "ACTIVE") return;
        if (game.whiteId !== userId && game.blackId !== userId) return;

        const allowed = await checkReactionRateLimit(gameId, userId);
        if (!allowed) return;

        socket.to(`game:${gameId}`).emit("game:reaction", {
          userId,
          reaction,
        });
      })
    );

    // Rematch offer
    socket.on(
      "game:rematch:offer",
      safe("game:rematch:offer", async (gameId: string) => {
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          select: {
            whiteId: true,
            blackId: true,
            timeControl: true,
            initialTime: true,
            increment: true,
            status: true,
          },
        });
        if (!game || game.status !== "COMPLETED") return;

        socket.to(`game:${gameId}`).emit("game:rematch:offered", {
          by: userId,
          gameId,
          timeControl: game.timeControl,
          initialTime: game.initialTime,
          increment: game.increment,
        });
      })
    );

    // Accept rematch
    socket.on(
      "game:rematch:accept",
      safe("game:rematch:accept", async (gameId: string) => {
        const oldGame = await prisma.game.findUnique({
          where: { id: gameId },
          select: {
            whiteId: true,
            blackId: true,
            timeControl: true,
            initialTime: true,
            increment: true,
          },
        });
        if (!oldGame) return;

        // Create new game with swapped colors
        const newGame = await prisma.game.create({
          data: {
            whiteId: oldGame.blackId,
            blackId: oldGame.whiteId,
            status: "ACTIVE",
            timeControl: oldGame.timeControl,
            initialTime: oldGame.initialTime,
            increment: oldGame.increment,
            whiteTimeLeft: oldGame.initialTime * 1000,
            blackTimeLeft: oldGame.initialTime * 1000,
            startedAt: new Date(),
          },
        });

        if (oldGame.timeControl !== "UNLIMITED") {
          await initClocks(newGame.id, oldGame.initialTime * 1000, oldGame.increment * 1000);
        }

        io.to(`game:${gameId}`).emit("game:rematch:started", { newGameId: newGame.id });
      })
    );
  });

  startTimeoutChecker(io);
}

/**
 * Process an incoming move from a player over the socket connection.
 * Validates the move, persists it, updates clocks, broadcasts to the room,
 * and checks for game-ending conditions.
 */
async function processMove(
  io: SocketServer,
  socket: Socket,
  userId: string,
  drawOffers: Map<string, string>,
  data: { gameId: string; from: string; to: string; promotion?: string }
) {
  const { gameId, from, to, promotion } = data;

  // Acquire per-game move lock (prevents concurrent move race condition)
  const lockKey = `game:lock:${gameId}`;
  const acquired = await redis.set(lockKey, "1", "EX", 5, "NX");
  if (!acquired) {
    socket.emit("game:error", { message: "Move already being processed" });
    return;
  }

  try {
    await processMoveInner(io, socket, userId, drawOffers, data);
  } finally {
    await redis.del(lockKey);
  }
}

async function processMoveInner(
  io: SocketServer,
  socket: Socket,
  userId: string,
  drawOffers: Map<string, string>,
  data: { gameId: string; from: string; to: string; promotion?: string }
) {
  const { gameId, from, to, promotion } = data;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      white: { select: { id: true } },
      black: { select: { id: true } },
    },
  });

  if (!game || game.status !== "ACTIVE") {
    socket.emit("game:error", { message: "Game not active" });
    return;
  }

  // Check it's this player's turn
  const chess = new Chess(game.fen);
  const isWhiteTurn = chess.turn() === "w";
  const isPlayerWhite = game.whiteId === userId;
  const isPlayerBlack = game.blackId === userId;

  if ((isWhiteTurn && !isPlayerWhite) || (!isWhiteTurn && !isPlayerBlack)) {
    socket.emit("game:error", { message: "Not your turn" });
    return;
  }

  // Check for timeout before processing move
  const timedOut = await isTimeout(gameId);
  if (timedOut) {
    gameTimeouts.inc();
    const result = timedOut === "white" ? "BLACK_WIN" : "WHITE_WIN";
    await endGame(io, gameId, result, "TIMEOUT");
    return;
  }

  // Validate and apply move
  const move = chess.move({ from, to, promotion: promotion || undefined });
  if (!move) {
    moveValidationFailures.inc();
    socket.emit("game:error", { message: "Invalid move" });
    return;
  }

  const ply = (await prisma.move.count({ where: { gameId } })) + 1;

  // Persist move
  await prisma.move.create({
    data: {
      gameId,
      ply,
      san: move.san,
      uci: `${from}${to}${promotion || ""}`,
      fen: chess.fen(),
    },
  });

  // Update game state
  await prisma.game.update({
    where: { id: gameId },
    data: {
      fen: chess.fen(),
      pgn: chess.pgn(),
    },
  });

  // Update clocks
  const isUnlimited = game.timeControl === "UNLIMITED";
  const clocks = await clockOnMove(gameId, isUnlimited);

  // Clear any draw offers
  drawOffers.delete(gameId);

  // Broadcast move to room
  io.to(`game:${gameId}`).emit("game:moved", {
    from,
    to,
    promotion,
    san: move.san,
    fen: chess.fen(),
    ply,
    clocks,
  });

  // Check for game end conditions
  if (chess.isCheckmate()) {
    const result = chess.turn() === "w" ? "BLACK_WIN" : "WHITE_WIN";
    await endGame(io, gameId, result, "CHECKMATE");
  } else if (
    chess.isDraw() ||
    chess.isStalemate() ||
    chess.isThreefoldRepetition() ||
    chess.isInsufficientMaterial()
  ) {
    await endGame(io, gameId, "DRAW", "AGREEMENT");
  }
}

/**
 * Start a periodic interval that checks all active games for clock timeouts
 * and ends any games where a player has run out of time.
 */
function startTimeoutChecker(io: SocketServer) {
  setInterval(async () => {
    try {
      const activeIds = await getActiveGameIds();
      for (const gameId of activeIds) {
        const timedOut = await isTimeout(gameId);
        if (timedOut) {
          const game = await prisma.game.findUnique({ where: { id: gameId } });
          if (game && game.status === "ACTIVE" && game.timeControl !== "UNLIMITED") {
            gameTimeouts.inc();
            const result = timedOut === "white" ? "BLACK_WIN" : "WHITE_WIN";
            await endGame(io, gameId, result, "TIMEOUT");
          }
        }
      }
    } catch (err) {
      logger.error({ err }, "timeout checker error");
    }
  }, 1000);
}
