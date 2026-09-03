import { Chess } from "chess.js";
import BOOK from "./book.json";

/**
 * The opening book.
 *
 * 3,810 named openings from the Lichess ECO database, keyed by the position
 * they produce rather than by the move sequence that reaches it. That matters:
 * transpositions are the normal case in openings, and a sequence-keyed book
 * fails to recognise the Sicilian if you reach it in a different order.
 *
 * Positions are stored as a hash rather than a full FEN, which cuts the payload
 * from 476KB to 248KB. There are no collisions across the whole set.
 */

const TABLE = BOOK as unknown as Record<string, [string, string]>;

export interface OpeningInfo {
  /** ECO code, e.g. "B90". */
  eco: string;
  /** Full name, e.g. "Sicilian Defense: Najdorf Variation". */
  name: string;
}

/** FNV-1a. Must match the hash used to build book.json. */
function hashPosition(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * The position key.
 *
 * Move counters are dropped, so the same position reached by different move
 * orders - or after a repetition - still matches.
 */
function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/** The opening for a position, if it is a named one. */
export function lookupOpening(fen: string): OpeningInfo | null {
  const entry = TABLE[hashPosition(positionKey(fen))];
  return entry ? { eco: entry[0], name: entry[1] } : null;
}

/** Whether this position appears in the book at all. */
export function isBookPosition(fen: string): boolean {
  return TABLE[hashPosition(positionKey(fen))] !== undefined;
}

/**
 * The opening name for a game, and how deep the book went.
 *
 * Walks the moves and keeps the LAST position found in the book, because
 * openings nest: after 1.e4 c5 2.Nf3 d6 the position is in the book three
 * times, and "Sicilian Defense: Najdorf Variation" is more useful than
 * "King's Pawn Opening".
 */
export function identifyOpening(moves: string[]): {
  opening: OpeningInfo | null;
  /** Ply at which the game left the book. */
  bookDepth: number;
} {
  const chess = new Chess();
  let best: OpeningInfo | null = null;
  let depth = 0;

  for (let i = 0; i < moves.length; i++) {
    try {
      chess.move(moves[i]);
    } catch {
      break;
    }
    const found = lookupOpening(chess.fen());
    if (found) {
      best = found;
      depth = i + 1;
    }
  }

  return { opening: best, bookDepth: depth };
}

/**
 * Whether a move played from this position is a book move.
 *
 * Checked on the position AFTER the move. A move is "book" if it leads to a
 * named opening position - which is why 1.e4 is book and 1.g4 is not, despite
 * both being first moves.
 *
 * This exists because classifying opening moves by evaluation is misleading:
 * the engine will happily call 1.e4 "excellent" and 1.d4 "good", which tells a
 * learner nothing and implies a difference that is not there.
 */
export function isBookMove(fenBefore: string, move: string): boolean {
  try {
    const chess = new Chess(fenBefore);
    const applied = chess.move(move);
    // Checked explicitly. If the move does not apply, the position is
    // unchanged and this would otherwise report whether the position BEFORE
    // the move was book - which is a different and much more misleading
    // question, and true for far too many moves.
    if (!applied) return false;
    return isBookPosition(chess.fen());
  } catch {
    return false;
  }
}

/** How many named openings the book holds. */
export const BOOK_SIZE = Object.keys(TABLE).length;

/**
 * Ply below which "book" tells you nothing.
 *
 * Measured, not guessed: every one of White's twenty first moves is in the ECO
 * database, including 1.a4 and 1.Na3. A label that applies to 100% of moves
 * carries no information - and because BOOK replaces the quality label, it also
 * suppresses the only feedback that would have been useful.
 *
 * By the second ply it is 30% of legal moves, and by the third 4%, so it starts
 * distinguishing almost immediately.
 */
export const BOOK_MEANINGFUL_FROM_PLY = 2;

/**
 * Whether a book label is worth showing at this point in the game.
 *
 * Separate from {@link isBookMove} because the question is different: one asks
 * whether the move is theory, this asks whether saying so helps.
 */
export function shouldLabelAsBook(fenBefore: string, move: string, ply: number): boolean {
  if (ply < BOOK_MEANINGFUL_FROM_PLY) return false;
  return isBookMove(fenBefore, move);
}
