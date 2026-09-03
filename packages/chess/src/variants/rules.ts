import { Chess, type Square, type Move } from "chess.js";

/**
 * Chess variants.
 *
 * Each of these is ordinary chess with one rule changed, which is why they can
 * be layered over a standard move generator rather than needing their own.
 * Crazyhouse is the exception and is handled separately below.
 *
 * The engine used for these is always Fairy-Stockfish - see `engineForVariant`.
 * These rules exist so the *client* can validate moves and detect endings
 * without a round trip, not to replace the engine.
 */

export type Variant =
  | "STANDARD"
  | "CHESS960"
  | "ATOMIC"
  | "CRAZYHOUSE"
  | "KINGOFTHEHILL"
  | "THREECHECK"
  | "ANTICHESS"
  | "HORDE";

export interface VariantInfo {
  id: Variant;
  name: string;
  /** One line, in plain terms, for the picker. */
  rule: string;
  /** How you win, when it differs from checkmate. */
  winsBy: string;
  /** UCI name Fairy-Stockfish knows it by. */
  uci: string;
}

export const VARIANTS: Record<Variant, VariantInfo> = {
  STANDARD: {
    id: "STANDARD",
    name: "Standard",
    rule: "Ordinary chess.",
    winsBy: "Checkmate.",
    uci: "chess",
  },
  CHESS960: {
    id: "CHESS960",
    name: "Chess960",
    rule: "The back rank is shuffled, the same for both players.",
    winsBy: "Checkmate.",
    uci: "chess",
  },
  ATOMIC: {
    id: "ATOMIC",
    name: "Atomic",
    rule: "Every capture explodes, destroying both pieces and every piece on the eight neighbouring squares. Pawns survive unless they were captured.",
    winsBy: "Blowing up the enemy king, or checkmate.",
    uci: "atomic",
  },
  CRAZYHOUSE: {
    id: "CRAZYHOUSE",
    name: "Crazyhouse",
    rule: "Pieces you capture become yours, and can be dropped back onto any empty square instead of moving.",
    winsBy: "Checkmate.",
    uci: "crazyhouse",
  },
  KINGOFTHEHILL: {
    id: "KINGOFTHEHILL",
    name: "King of the Hill",
    rule: "The four central squares are the hill.",
    winsBy: "Walking your king into the centre, or checkmate.",
    uci: "kingofthehill",
  },
  THREECHECK: {
    id: "THREECHECK",
    name: "Three-check",
    rule: "Checks are counted.",
    winsBy: "Checking the enemy king three times, or checkmate.",
    uci: "3check",
  },
  ANTICHESS: {
    id: "ANTICHESS",
    name: "Antichess",
    rule: "Capturing is compulsory when available. There is no check and the king is an ordinary piece.",
    winsBy: "Losing all your pieces, or having no legal move.",
    uci: "antichess",
  },
  HORDE: {
    id: "HORDE",
    name: "Horde",
    rule: "Black plays a normal army. White has thirty-six pawns and no king.",
    winsBy: "Black wins by taking every white pawn. White wins by checkmate.",
    uci: "horde",
  },
};

/** Variants a player can start a game in. */
export const PLAYABLE_VARIANTS: Variant[] = [
  "STANDARD",
  "CHESS960",
  "ATOMIC",
  "CRAZYHOUSE",
  "KINGOFTHEHILL",
  "THREECHECK",
  "ANTICHESS",
  "HORDE",
];

/** Whether this variant needs Fairy-Stockfish rather than plain Stockfish. */
export function needsFairyEngine(variant: Variant): boolean {
  return variant !== "STANDARD" && variant !== "CHESS960";
}

/**
 * Starting position, when it differs.
 *
 * Returns null for variants that begin from the ordinary array - most of them
 * change how the game is played, not how it starts.
 */
export function startingFenFor(variant: Variant): string | null {
  if (variant === "HORDE") {
    // Black's usual army; white has pawns filling four ranks plus two more.
    return "rnbqkbnr/pppppppp/8/1PP2PP1/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP w kq - 0 1";
  }
  return null;
}

// ─────────────────────────── Atomic ───────────────────────────

/**
 * The squares destroyed by a capture on `square`.
 *
 * The captured piece and the capturing piece both go, along with every
 * non-pawn on the eight surrounding squares. Pawns are immune to the blast
 * itself, which is what makes pawn structure matter so much in Atomic.
 */
export function explosionSquares(chess: Chess, target: Square): Square[] {
  const file = target.charCodeAt(0);
  const rank = Number(target[1]);
  const out: Square[] = [target];

  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = String.fromCharCode(file + df);
      const r = rank + dr;
      if (f < "a" || f > "h" || r < 1 || r > 8) continue;
      const sq = `${f}${r}` as Square;
      const piece = chess.get(sq);
      // Pawns survive the blast. Only the captured pawn itself dies.
      if (piece && piece.type !== "p") out.push(sq);
    }
  }
  return out;
}

/**
 * Apply a move in Atomic, returning the resulting position.
 *
 * Returns null when the move is illegal. Note that a move which blows up your
 * own king is illegal even if it blows up theirs at the same time - the mover
 * loses in that case, so it is never a winning move.
 */
export function applyAtomicMove(
  fen: string,
  from: Square,
  to: Square,
  promotion?: string
): { fen: string; exploded: Square[] } | null {
  const chess = new Chess(fen);
  const mover = chess.turn();

  let move: Move | null = null;
  try {
    move = chess.move({ from, to, promotion: promotion ?? "q" });
  } catch {
    return null;
  }
  if (!move) return null;

  // A quiet move is ordinary chess.
  if (!move.captured) {
    return { fen: chess.fen(), exploded: [] };
  }

  // Work out the blast from the position AFTER the move, so the capturing
  // piece is on the target square and dies with everything else.
  const exploded = explosionSquares(chess, to);
  for (const sq of exploded) chess.remove(sq);

  const after = chess.fen();

  // Blowing up your own king is illegal, whatever else it achieves - so a
  // move that destroys both kings is never a winning move, it is simply not a
  // move. Checked by parsing, because a position missing a king is exactly
  // what chess.js will not load.
  const { white, black } = countPieces(after);
  const moverKing = mover === "w" ? white.k : black.k;
  if (!moverKing) return null;

  return { fen: after, exploded };
}

/**
 * Count the pieces in a FEN, without chess.js.
 *
 * chess.js refuses to construct a position missing either king - reasonable
 * for standard chess, fatal here. Atomic ends by exploding a king, Horde gives
 * White no king at all, and in Antichess kings are ordinary capturable pieces.
 * All three need to reason about positions chess.js will not accept, so the
 * board field is parsed directly.
 */
export function countPieces(fen: string): {
  white: Record<string, number>;
  black: Record<string, number>;
  whiteTotal: number;
  blackTotal: number;
} {
  const board = fen.split(" ")[0];
  const white: Record<string, number> = {};
  const black: Record<string, number> = {};
  let whiteTotal = 0;
  let blackTotal = 0;

  for (const ch of board) {
    if (ch === "/" || (ch >= "1" && ch <= "8")) continue;
    const lower = ch.toLowerCase();
    if (ch === lower) {
      black[lower] = (black[lower] ?? 0) + 1;
      blackTotal++;
    } else {
      white[lower] = (white[lower] ?? 0) + 1;
      whiteTotal++;
    }
  }
  return { white, black, whiteTotal, blackTotal };
}

function hasKing(chess: Chess, colour: "w" | "b"): boolean {
  for (const row of chess.board()) {
    for (const sq of row) {
      if (sq && sq.type === "k" && sq.color === colour) return true;
    }
  }
  return false;
}

/** In Atomic, a side with no king has lost, checkmate or not. */
export function atomicResult(fen: string): "white" | "black" | null {
  const { white, black } = countPieces(fen);
  if (!black.k) return "white";
  if (!white.k) return "black";
  return null;
}

// ────────────────────── King of the Hill ──────────────────────

/** The hill. */
export const HILL: Square[] = ["d4", "d5", "e4", "e5"];

/** Whether a king has reached the centre, which wins immediately. */
export function hillWinner(fen: string): "white" | "black" | null {
  // Parsed rather than loaded: King of the Hill positions are always legal,
  // but keeping every result function on the same footing avoids a surprise
  // the first time one is called with an unusual position.
  const rows = fen.split(" ")[0].split("/");
  for (const sq of HILL) {
    const file = sq.charCodeAt(0) - 97;
    const rank = Number(sq[1]);
    const row = rows[8 - rank];
    let col = 0;
    for (const ch of row) {
      if (ch >= "1" && ch <= "8") {
        col += Number(ch);
        continue;
      }
      if (col === file) {
        if (ch === "K") return "white";
        if (ch === "k") return "black";
      }
      col++;
    }
  }
  return null;
}

// ─────────────────────── Three-check ───────────────────────

export interface CheckCount {
  white: number;
  black: number;
}

/** Whether either side has given three checks. */
export function threeCheckWinner(counts: CheckCount): "white" | "black" | null {
  if (counts.white >= 3) return "white";
  if (counts.black >= 3) return "black";
  return null;
}

/**
 * Update the count after a move.
 *
 * Counts checks given, not checks received, so `white` is how many times White
 * has checked Black.
 */
export function countCheck(
  counts: CheckCount,
  fenAfter: string,
  moverWasWhite: boolean
): CheckCount {
  const chess = new Chess(fenAfter);
  if (!chess.isCheck()) return counts;
  return moverWasWhite
    ? { ...counts, white: counts.white + 1 }
    : { ...counts, black: counts.black + 1 };
}

// ─────────────────────────  Antichess ─────────────────────────

/**
 * Legal moves in Antichess.
 *
 * Capturing is compulsory when any capture exists, which is the whole game -
 * without that rule it is not Antichess, it is just chess played badly.
 *
 * Check does not exist here, so moves that leave a king attacked are legal.
 * chess.js will not generate those, which means this is an approximation for
 * positions where a king is pinned. Fairy-Stockfish is authoritative; this is
 * for immediate client feedback.
 */
export function antichessMoves(fen: string): Move[] {
  const chess = new Chess(fen);
  const all = chess.moves({ verbose: true });
  const captures = all.filter((m) => m.captured);
  return captures.length > 0 ? captures : all;
}

/** In Antichess, losing everything is winning. */
export function antichessResult(fen: string): "white" | "black" | null {
  const { whiteTotal, blackTotal } = countPieces(fen);
  if (whiteTotal === 0) return "white";
  if (blackTotal === 0) return "black";

  // Having no legal move also wins, for the side unable to move. Only checked
  // when both sides still have pieces, since chess.js cannot load a position
  // that has lost a king.
  try {
    if (antichessMoves(fen).length === 0) {
      return fen.split(" ")[1] === "w" ? "white" : "black";
    }
  } catch {
    // A position chess.js will not accept is one where a king has already
    // gone, and the piece counts above have handled it.
  }
  return null;
}

// ──────────────────────────  Horde ──────────────────────────

/** Black wins Horde by capturing every white pawn. */
export function hordeResult(fen: string): "white" | "black" | null {
  const { whiteTotal } = countPieces(fen);
  if (whiteTotal === 0) return "black";
  return null;
}

// ────────────────────────  Crazyhouse ────────────────────────

/**
 * A player's pocket: pieces captured and available to drop.
 *
 * Crazyhouse is the one variant that cannot be layered over a standard move
 * generator, because dropping is a move type chess.js has no concept of. The
 * pocket is tracked here and the server, holding Fairy-Stockfish, remains
 * authoritative for legality.
 */
export interface Pocket {
  p: number;
  n: number;
  b: number;
  r: number;
  q: number;
}

export const EMPTY_POCKET: Pocket = { p: 0, n: 0, b: 0, r: 0, q: 0 };

/**
 * Add a captured piece to the capturing side's pocket.
 *
 * A promoted piece reverts to a pawn when captured, which is why the original
 * type has to be tracked rather than read off the board.
 */
export function addToPocket(pocket: Pocket, captured: string, wasPromoted: boolean): Pocket {
  const type = wasPromoted ? "p" : (captured as keyof Pocket);
  if (!(type in pocket)) return pocket;
  return { ...pocket, [type]: pocket[type as keyof Pocket] + 1 };
}

/** Squares a piece may be dropped on. */
export function dropSquares(fen: string, piece: keyof Pocket): Square[] {
  const chess = new Chess(fen);
  const out: Square[] = [];
  for (const row of chess.board()) {
    for (const sq of row) {
      if (sq) continue;
    }
  }
  // Every empty square, minus the back ranks for pawns - a pawn on the first
  // or eighth rank could never have arrived there legally and could not move.
  for (const file of "abcdefgh") {
    for (let rank = 1; rank <= 8; rank++) {
      const square = `${file}${rank}` as Square;
      if (chess.get(square)) continue;
      if (piece === "p" && (rank === 1 || rank === 8)) continue;
      out.push(square);
    }
  }
  return out;
}

/** Whether the pocket holds anything at all. */
export function pocketIsEmpty(pocket: Pocket): boolean {
  return Object.values(pocket).every((n) => n === 0);
}
