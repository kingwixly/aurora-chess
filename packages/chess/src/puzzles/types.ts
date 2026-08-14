import { updateFromGame } from "../rating/glicko2";

/**
 * Puzzle types and solution checking.
 *
 * The important decision here: a puzzle is **not** validated by exact move
 * match. Several of Aurora's own puzzles have more than one correct answer —
 * the Arabian position has two distinct mates in one, and both are equally
 * right. Rejecting a player's legitimate mate because a stored string says
 * otherwise is the fastest way to make a trainer feel broken.
 *
 * So mate puzzles accept any move that delivers mate; everything else falls
 * back to the stored line.
 */

export interface PuzzleData {
  id: string;
  /** Starting position, with the solver to move. */
  fen: string;
  rating: number;
  title: string;
  /** One line of setup, shown before the first move. */
  intro: string;
  themes: string[];
  /** Solution in UCI, alternating solver and opponent, solver first. */
  moves: string[];
  /** One per entry in `moves`, same order. */
  explanations: string[];
}

/** Whether the goal is mate, in which case any mating move is accepted. */
export function isMatePuzzle(themes: readonly string[]): boolean {
  return themes.some((t) => t.startsWith("mateIn") || t.toLowerCase().endsWith("mate"));
}

export type PuzzleAttempt =
  | { status: "continue"; reply: string; explanation: string; replyExplanation: string }
  | { status: "solved"; explanation: string }
  | { status: "wrong" };

/** Index into `moves` for the solver's nth move (0-based). */
export function solverPly(movesMade: number): number {
  return movesMade * 2;
}

/**
 * Check a solver's move.
 *
 * @param puzzle - The puzzle being solved.
 * @param movesMade - How many moves the solver has already played correctly.
 * @param uci - The move just played.
 * @param deliversMate - Whether that move gives checkmate, computed by the
 *   caller which has a board. Passing it in keeps this module free of a chess
 *   engine dependency so it can run anywhere.
 */
export function checkPuzzleMove(
  puzzle: PuzzleData,
  movesMade: number,
  uci: string,
  deliversMate: boolean
): PuzzleAttempt {
  const ply = solverPly(movesMade);
  const expected = puzzle.moves[ply];
  if (expected === undefined) return { status: "wrong" };

  // Any mate is a correct answer to a mate puzzle, whatever the stored line says.
  const correct = uci === expected || (isMatePuzzle(puzzle.themes) && deliversMate);
  if (!correct) return { status: "wrong" };

  const explanation = puzzle.explanations[ply] ?? "";
  const reply = puzzle.moves[ply + 1];

  // Mate ends the puzzle even if the stored line continues -- a player who
  // found a faster mate has finished.
  if (deliversMate || reply === undefined) {
    return { status: "solved", explanation };
  }

  return {
    status: "continue",
    reply,
    explanation,
    replyExplanation: puzzle.explanations[ply + 1] ?? "",
  };
}

/**
 * Rating change after a puzzle attempt.
 *
 * Glicko-2, treating the puzzle as an opponent whose rating is well established
 * — which it is, since a puzzle's difficulty is measured across everyone who
 * has attempted it. The player's own deviation does the work: a new solver
 * finds their level in a handful of puzzles instead of dozens.
 */
export function puzzleRatingChange(
  player: { rating: number; deviation: number; volatility: number },
  puzzleRating: number,
  solved: boolean
): { rating: number; deviation: number; volatility: number } {
  return updateFromGame(
    player,
    // A puzzle's difficulty is settled, so it is given a low deviation: the
    // uncertainty in the encounter belongs to the solver, not the puzzle.
    { rating: puzzleRating, deviation: 60, volatility: 0.06 },
    solved ? 1 : 0
  );
}
