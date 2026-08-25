import { Chess } from "chess.js";
import { StockfishEngine } from "./stockfish.js";
import { createChildLogger } from "./logger.js";

const log = createChildLogger("bot-engine");

let engine: StockfishEngine | null = null;
let currentElo: number | null = null;

async function getEngine(): Promise<StockfishEngine> {
  if (!engine) {
    engine = new StockfishEngine();
    await engine.init();
    log.info("bot stockfish engine initialized");
  }
  return engine;
}

/**
 * Get the best move from the bot engine at a given Elo strength.
 * @param fen - The current board position in FEN notation.
 * @param elo - Target Elo strength for the bot (clamped to 200-3200).
 * @param maxTimeMs - Maximum thinking time in milliseconds.
 * @returns The best move in UCI format (e.g. "e2e4").
 */
/**
 * An opening book move, if the bot has a preference and we are still in it.
 *
 * Stockfish at a capped UCI_Elo plays whatever it likes in the opening, which
 * is why bots rated 2600+ were opening with the Scandinavian: their
 * `preferredOpenings` were stored, validated, and then never read by anything.
 *
 * Only used while the position is still in the book line. After that the engine
 * takes over normally — this shapes the character of the opening, it does not
 * play the game.
 */
export interface OpeningPrefs {
  asWhite?: string[];
  asBlack?: string[];
}

function bookMove(fen: string, prefs: OpeningPrefs | undefined): string | null {
  if (!prefs) return null;

  const chess = new Chess(fen);
  // Which side the BOT is on decides which repertoire applies — using the
  // wrong one produces exactly the nonsense this is meant to prevent.
  const openings = chess.turn() === "w" ? prefs.asWhite : prefs.asBlack;
  if (!openings || openings.length === 0) return null;

  // Every line is a complete sequence from the starting position, INCLUDING
  // the opponent's moves. Storing black lines as bare replies ("e5 Nf3 Nc6")
  // meant index 0 of the line did not line up with ply 0 of the game, so no
  // black line could ever match and the repertoire silently did nothing.
  const played = chess.history();
  // Only the first few moves. Beyond that a "preference" becomes a script.
  if (played.length >= 8) return null;

  const candidates = openings.filter((line) => {
    const moves = line.trim().split(/\s+/);
    if (moves.length <= played.length) return false;
    return played.every((san, i) => moves[i] === san);
  });
  if (candidates.length === 0) return null;

  const line = candidates[Math.floor(Math.random() * candidates.length)];
  const next = line.trim().split(/\s+/)[played.length];

  // Verify before trusting it: a typo in the roster must not produce an
  // illegal move that kills the game.
  const legal = chess.moves({ verbose: true }).find((m) => m.san === next);
  return legal ? legal.from + legal.to + (legal.promotion ?? "") : null;
}

export async function getBotMove(
  fen: string,
  elo: number,
  maxTimeMs: number = 2000,
  preferredOpenings?: OpeningPrefs
): Promise<string> {
  const fromBook = bookMove(fen, preferredOpenings);
  if (fromBook) return fromBook;

  // WorstFish inverts the search rather than weakening it. A very low UCI_Elo
  // plays badly at random; this plays badly on purpose, which is a different
  // and much funnier thing — and it is genuinely hard to beat yourself to.
  if (elo === WORSTFISH_ELO_SENTINEL) {
    const worst = await getWorstMove(fen);
    if (worst) return worst;
  }

  if (elo === DRAWFISH_ELO_SENTINEL) {
    const level = await getLevellingMove(fen);
    if (level) return level;
  }

  const eng = await getEngine();
  const proc = eng["process"];
  if (!proc) throw new Error("Engine not initialized");

  const clampedElo = Math.max(200, Math.min(3200, elo));

  // Set UCI_Elo and Skill Level if changed
  if (currentElo !== clampedElo) {
    proc.stdin.write("setoption name UCI_LimitStrength value true\n");
    proc.stdin.write(`setoption name UCI_Elo value ${clampedElo}\n`);

    // Skill Level 0-20 mapped from elo (additional weakness control)
    // Stockfish Skill Level adds random errors at low levels
    const skillLevel = Math.min(20, Math.max(0, Math.floor((clampedElo - 200) / 150)));
    proc.stdin.write(`setoption name Skill Level value ${skillLevel}\n`);

    await eng.send("isready", "readyok");
    currentElo = clampedElo;
  }

  proc.stdin.write("ucinewgame\n");
  proc.stdin.write(`position fen ${fen}\n`);
  await eng.send("isready", "readyok");

  // Think time: very short at low elo, longer at high elo
  // Low elo bots should think less (fewer nodes = weaker)
  const thinkTime = Math.min(maxTimeMs, Math.max(100, Math.floor(clampedElo / 4)));

  // Also limit depth at low elos
  const maxDepth = clampedElo < 600 ? 3 : clampedElo < 1200 ? 6 : clampedElo < 2000 ? 10 : 18;

  const lines = await eng.send(`go movetime ${thinkTime} depth ${maxDepth}`, "bestmove");

  let bestMove = "";
  for (const line of lines) {
    if (line.startsWith("bestmove")) {
      bestMove = line.split(" ")[1] || "";
      break;
    }
  }

  if (!bestMove) {
    log.error({ fen, elo: clampedElo }, "bot engine returned no move");
    throw new Error("Bot engine returned no move");
  }

  return bestMove;
}

/** Destroy the cached Stockfish engine process. Called during graceful shutdown. */
export function destroyBotEngine(): void {
  if (engine) {
    engine.destroy();
    engine = null;
    currentElo = null;
    log.info("bot stockfish engine destroyed");
  }
}

/** WorstFish is identified by this rating; it is not a strength setting. */
export const WORSTFISH_ELO_SENTINEL = 200;

/**
 * The worst legal move in the position.
 *
 * Evaluates every legal reply and picks the one that leaves the mover in the
 * worst shape. Uses a shallow search per move because depth is wasted here —
 * hanging a queen is obvious at depth 1, and the joke does not improve with
 * accuracy.
 *
 * Never returns an illegal move: candidates come from the move generator.
 */
export async function getWorstMove(fen: string): Promise<string | null> {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const eng = await getEngine();
  const proc = eng["process"];
  if (!proc) return null;

  let worst: { uci: string; score: number } | null = null;

  for (const m of moves) {
    const next = new Chess(fen);
    next.move(m.san);

    // Mating yourself is the worst outcome available; take it immediately.
    if (next.isCheckmate()) {
      return m.from + m.to + (m.promotion ?? "");
    }

    proc.stdin.write("ucinewgame\n");
    proc.stdin.write(`position fen ${next.fen()}\n`);
    const lines = await eng.send("go depth 4", "bestmove");
    // Score is from the OPPONENT's point of view after our move, so the worst
    // move for us is the one that scores highest for them.
    let score = 0;
    for (const line of lines) {
      const cp = line.match(/score cp (-?\d+)/);
      const mate = line.match(/score mate (-?\d+)/);
      if (mate) score = Number(mate[1]) > 0 ? 100000 : -100000;
      else if (cp) score = Number(cp[1]);
    }
    if (!worst || score > worst.score) {
      worst = { uci: m.from + m.to + (m.promotion ?? ""), score };
    }
  }

  return worst?.uci ?? null;
}

/** DrawFish is identified by this rating; it is not a strength setting. */
export const DRAWFISH_ELO_SENTINEL = 201;

/**
 * The move that brings the evaluation closest to level.
 *
 * DrawFish does not play FOR a draw in the usual sense — it does not steer
 * toward fortresses or perpetuals. It simply picks, each turn, whichever legal
 * move leaves the position nearest to 0.00.
 *
 * Two consequences worth stating, because they are the interesting part:
 *
 * - If a draw is available in ONE move — stalemate, threefold, insufficient
 *   material — that move evaluates to exactly 0 and wins outright. Taken.
 * - A draw available in two moves is NOT sought, because reaching it usually
 *   requires gaining an advantage first, and a move that gains an advantage is
 *   further from 0.00 than one that does not. DrawFish will decline it.
 *
 * So it holds the game level while it can, and if you build a winning position
 * it will pick whichever losing move loses by the smallest margin — sliding
 * toward the abyss as slowly as arithmetic allows.
 */
export async function getLevellingMove(fen: string): Promise<string | null> {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const eng = await getEngine();
  const proc = eng["process"];
  if (!proc) return null;

  let best: { uci: string; distance: number } | null = null;

  for (const m of moves) {
    const next = new Chess(fen);
    next.move(m.san);
    const uci = m.from + m.to + (m.promotion ?? "");

    // An immediate draw is exactly 0.00 and cannot be beaten. Take it without
    // asking the engine.
    if (next.isStalemate() || next.isInsufficientMaterial() || next.isThreefoldRepetition()) {
      return uci;
    }
    // Mating the opponent is the furthest possible state from level.
    if (next.isCheckmate()) continue;

    proc.stdin.write("ucinewgame\n");
    proc.stdin.write(`position fen ${next.fen()}\n`);
    const lines = await eng.send("go depth 6", "bestmove");

    let score = 0;
    for (const line of lines) {
      const cp = line.match(/score cp (-?\d+)/);
      const mate = line.match(/score mate (-?\d+)/);
      if (mate) score = Number(mate[1]) > 0 ? 100000 : -100000;
      else if (cp) score = Number(cp[1]);
    }

    const distance = Math.abs(score);
    if (!best || distance < best.distance) {
      best = { uci, distance };
    }
  }

  return best?.uci ?? null;
}
