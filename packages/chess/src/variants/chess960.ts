import { Chess } from "chess.js";

/**
 * Chess960 (Fischer Random).
 *
 * The pieces on the back rank are shuffled, subject to three constraints, and
 * both sides get the same arrangement. Everything else is ordinary chess.
 *
 * **Why this file exists rather than leaning on chess.js:** chess.js applies
 * the standard castling rule — move the king two squares toward the rook. In
 * Chess960 the king always finishes on g1/g8 (kingside) or c1/c8 (queenside)
 * no matter where it started, and the rook lands on f1/d1. With the king on b1,
 * chess.js sends it to d1 for `O-O`; the correct destination is g1. Building on
 * that unchecked would have produced games that were quietly illegal.
 */

/** A back-rank arrangement, files a to h. */
export type BackRank = string;

/**
 * Is this arrangement legal for Chess960?
 *
 * Three rules, and all three matter:
 * - the two bishops sit on opposite-coloured squares
 * - the king sits somewhere between the two rooks
 * - both sides mirror each other, which is handled by construction
 */
export function isValidBackRank(rank: BackRank): boolean {
  if (rank.length !== 8) return false;
  const counts: Record<string, number> = {};
  for (const c of rank) counts[c] = (counts[c] ?? 0) + 1;
  if (counts.k !== 1 || counts.q !== 1 || counts.r !== 2 || counts.b !== 2 || counts.n !== 2) {
    return false;
  }

  const bishops = [...rank].map((c, i) => (c === "b" ? i : -1)).filter((i) => i >= 0);
  if (bishops[0] % 2 === bishops[1] % 2) return false;

  const rooks = [...rank].map((c, i) => (c === "r" ? i : -1)).filter((i) => i >= 0);
  const king = rank.indexOf("k");
  if (!(king > rooks[0] && king < rooks[1])) return false;

  return true;
}

/**
 * The arrangement for a given position number, 0 to 959.
 *
 * Uses Scharnagl's numbering, which is the standard: the same number always
 * yields the same position, so a game can record which one it used and be
 * replayed exactly. Position 518 is the ordinary starting array.
 */
export function backRankForPosition(id: number): BackRank {
  if (!Number.isInteger(id) || id < 0 || id > 959) {
    throw new RangeError(`Chess960 position must be 0-959, got ${id}`);
  }

  const squares: (string | null)[] = Array(8).fill(null);

  // Light-squared bishop, then dark-squared: the two bishop placements are the
  // first two digits and are what guarantee opposite colours.
  let n = id;
  const b1 = n % 4;
  n = Math.floor(n / 4);
  const b2 = n % 4;
  n = Math.floor(n / 4);
  squares[b1 * 2 + 1] = "b";
  squares[b2 * 2] = "b";

  // Queen goes in the nth free square.
  const q = n % 6;
  n = Math.floor(n / 6);
  let free = squares.map((s, i) => (s === null ? i : -1)).filter((i) => i >= 0);
  squares[free[q]] = "q";

  // The remaining five digits pick the two knight squares out of the five left.
  const KNIGHT_PAIRS = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
    [3, 4],
  ];
  const [n1, n2] = KNIGHT_PAIRS[n];
  free = squares.map((s, i) => (s === null ? i : -1)).filter((i) => i >= 0);
  squares[free[n1]] = "n";
  squares[free[n2]] = "n";

  // Rook, king, rook fill the last three squares in that order, which
  // satisfies the king-between-rooks rule automatically.
  free = squares.map((s, i) => (s === null ? i : -1)).filter((i) => i >= 0);
  squares[free[0]] = "r";
  squares[free[1]] = "k";
  squares[free[2]] = "r";

  return squares.join("");
}

/** The ordinary starting array, as a Chess960 position number. */
export const STANDARD_POSITION_ID = 518;

/** A random position number. */
export function randomPositionId(): number {
  return Math.floor(Math.random() * 960);
}

/**
 * Full starting FEN for a position number.
 *
 * Castling rights are written as KQkq rather than Shredder notation, because
 * chess.js rejects Shredder-FEN outright. The rook files are recoverable from
 * the position itself, which is what {@link castlingRookFiles} does.
 */
export function fenForPosition(id: number): string {
  const rank = backRankForPosition(id);
  return `${rank}/pppppppp/8/8/8/8/PPPPPPPP/${rank.toUpperCase()} w KQkq - 0 1`;
}

/** Where the rooks started, which castling needs and plain FEN does not record. */
export function castlingRookFiles(id: number): { kingside: number; queenside: number } {
  const rank = backRankForPosition(id);
  const rooks = [...rank].map((c, i) => (c === "r" ? i : -1)).filter((i) => i >= 0);
  return { queenside: rooks[0], kingside: rooks[1] };
}

const FILES = "abcdefgh";

export type CastlingSide = "king" | "queen";

/**
 * Attempt a Chess960 castling move.
 *
 * Returns the resulting FEN, or null if the castle is not legal. Applied by
 * building the destination position directly rather than asking chess.js to
 * move the king, because chess.js would move it to the wrong square.
 *
 * The rules being enforced:
 * - every square the king passes through, and its destination, must be free of
 *   attack, and the king must not currently be in check
 * - every square between the king and rook, and both destinations, must be
 *   empty except for the castling pair themselves
 * - the king finishes on g-file (kingside) or c-file (queenside); the rook on
 *   f-file or d-file respectively
 */
export function applyCastling(fen: string, side: CastlingSide, positionId: number): string | null {
  const game = new Chess(fen);
  const turn = game.turn();
  const rank = turn === "w" ? "1" : "8";
  const rooks = castlingRookFiles(positionId);

  const rookFrom = side === "king" ? rooks.kingside : rooks.queenside;
  const kingTo = side === "king" ? 6 : 2; // g-file or c-file
  const rookTo = side === "king" ? 5 : 3; // f-file or d-file

  const board = game.board();
  const rankIndex = turn === "w" ? 7 : 0;
  const kingFrom = board[rankIndex].findIndex((sq) => sq && sq.type === "k" && sq.color === turn);
  if (kingFrom < 0) return null;

  const rookSquare = board[rankIndex][rookFrom];
  if (!rookSquare || rookSquare.type !== "r" || rookSquare.color !== turn) return null;

  // Castling rights must still be present.
  const rights = fen.split(" ")[2];
  const needed = turn === "w" ? (side === "king" ? "K" : "Q") : side === "king" ? "k" : "q";
  if (!rights.includes(needed)) return null;

  // Every square the pair moves through must be empty, ignoring the two of
  // them — in some positions the king or rook already stands on a destination.
  const occupiedSpan = (from: number, to: number) => {
    const [lo, hi] = from < to ? [from, to] : [to, from];
    for (let f = lo; f <= hi; f++) {
      if (f === kingFrom || f === rookFrom) continue;
      if (board[rankIndex][f]) return true;
    }
    return false;
  };
  if (occupiedSpan(kingFrom, kingTo) || occupiedSpan(rookFrom, rookTo)) return null;

  // The king may not start in, pass through, or land in check.
  if (game.inCheck()) return null;
  const [lo, hi] = kingFrom < kingTo ? [kingFrom, kingTo] : [kingTo, kingFrom];
  for (let f = lo; f <= hi; f++) {
    if (game.isAttacked((FILES[f] + rank) as never, turn === "w" ? "b" : "w")) return null;
  }

  // Build the result directly.
  const rows = fen.split(" ")[0].split("/");
  const rowIndex = turn === "w" ? 7 : 0;
  const cells: (string | null)[] = Array(8).fill(null);
  let file = 0;
  for (const ch of rows[rowIndex]) {
    if (/\d/.test(ch)) file += Number(ch);
    else cells[file++] = ch;
  }
  cells[kingFrom] = null;
  cells[rookFrom] = null;
  cells[kingTo] = turn === "w" ? "K" : "k";
  cells[rookTo] = turn === "w" ? "R" : "r";

  let row = "";
  let gap = 0;
  for (const c of cells) {
    if (c === null) gap++;
    else {
      if (gap) row += String(gap);
      gap = 0;
      row += c;
    }
  }
  if (gap) row += String(gap);
  rows[rowIndex] = row;

  const parts = fen.split(" ");
  parts[0] = rows.join("/");
  parts[1] = turn === "w" ? "b" : "w";
  // Castling extinguishes that side's rights entirely.
  const stripped = rights.replace(turn === "w" ? /[KQ]/g : /[kq]/g, "") || "-";
  parts[2] = stripped;
  parts[3] = "-";
  parts[4] = String(Number(parts[4]) + 1);
  if (turn === "b") parts[5] = String(Number(parts[5]) + 1);

  return parts.join(" ");
}
