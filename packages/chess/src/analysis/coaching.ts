/**
 * Rating-banded coaching language.
 *
 * The complaint that turned up repeatedly in research on the big sites: the
 * same sentence is shown to a 400 and a 1900. "You missed an in-between move
 * that maintained the initiative" is accurate and useless to a beginner, while
 * "this loses a piece" is patronising to a strong player.
 *
 * Same classification, four vocabularies.
 */

export type CoachingBand = "beginner" | "intermediate" | "advanced" | "expert";

/** Which band a rating falls into. Glicko-2 scale, 1500-centred. */
export function bandFor(rating: number): CoachingBand {
  if (rating < 1300) return "beginner";
  if (rating < 1700) return "intermediate";
  if (rating < 2100) return "advanced";
  return "expert";
}

export type MoveQuality =
  /** Established theory. Not judged on evaluation. */
  "book" | "brilliant" | "great" | "best" | "good" | "inaccuracy" | "mistake" | "blunder";

const TEXT: Record<MoveQuality, Record<CoachingBand, string>> = {
  book: {
    beginner: "This is a known opening move — people have played it for centuries.",
    intermediate: "Book move. This is established theory.",
    advanced: "Still in book.",
    expert: "Book.",
  },
  brilliant: {
    beginner: "A brilliant move. You gave up material and it was worth it.",
    intermediate: "Brilliant — a sacrifice the engine agrees with.",
    advanced: "Brilliant. The material investment is justified by the resulting initiative.",
    expert: "Brilliant.",
  },
  great: {
    beginner: "A great move. This was the one move that worked here.",
    intermediate: "Great move — clearly better than the alternatives.",
    advanced: "Great move. The only continuation that holds the advantage.",
    expert: "Great move.",
  },
  best: {
    beginner: "The best move. Well found.",
    intermediate: "Best move.",
    advanced: "Best move.",
    expert: "Best.",
  },
  good: {
    beginner: "A good move. Not the very best, but nothing goes wrong.",
    intermediate: "Good. A small step behind the engine's choice.",
    advanced: "Good — marginally behind the main line.",
    expert: "Good.",
  },
  inaccuracy: {
    beginner: "A slightly better move was available. Nothing is lost here.",
    intermediate: "Inaccuracy. There was a more precise move.",
    advanced: "Inaccuracy — the position loosens slightly.",
    expert: "Inaccuracy.",
  },
  mistake: {
    beginner: "This one costs you. Look at what your opponent can do next.",
    intermediate: "A mistake. This hands over a real advantage.",
    advanced: "Mistake — the evaluation swings substantially.",
    expert: "Mistake.",
  },
  blunder: {
    beginner: "A blunder. Check whether any of your pieces can be taken for free.",
    intermediate: "Blunder. This loses material or allows a decisive tactic.",
    advanced: "Blunder — the position is now losing.",
    expert: "Blunder.",
  },
};

/** Coaching text for a move, pitched at the player's level. */
export function coachingText(quality: MoveQuality, rating: number): string {
  return TEXT[quality][bandFor(rating)];
}

/**
 * A recurring weakness across many games.
 *
 * The gap neither big site fills: single-game reports cannot tell you "you make
 * this mistake every week". Aurora stores every game and every classification,
 * so this is a query rather than a research project.
 */
export interface PatternFinding {
  theme: string;
  occurrences: number;
  gamesConsidered: number;
  advice: string;
}

/** Minimum occurrences before calling something a pattern rather than noise. */
export const PATTERN_MIN_OCCURRENCES = 4;

const PATTERN_ADVICE: Record<string, Record<CoachingBand, string>> = {
  hangingPiece: {
    beginner: "Before each move, check every piece you own for whether it can be taken.",
    intermediate: "Scan for undefended pieces before committing to a plan.",
    advanced: "Loose pieces are recurring here — check them before calculating.",
    expert: "Recurring loose-piece oversights.",
  },
  missedFork: {
    beginner: "Look for knight moves that attack two things at once.",
    intermediate: "You are missing forks. Check knight jumps near the enemy king and queen.",
    advanced: "Fork motifs are going unnoticed in calculation.",
    expert: "Missed fork motifs.",
  },
  timeTrouble: {
    beginner: "You are running low on time. Try to move faster in simple positions.",
    intermediate: "Time trouble is costing you games. Budget the opening more tightly.",
    advanced: "Clock management is the recurring loss condition here.",
    expert: "Recurring time trouble.",
  },
  backRank: {
    beginner: "Give your king an escape square by moving a pawn in front of it.",
    intermediate: "Back-rank weaknesses keep appearing. Create luft earlier.",
    advanced: "Back-rank vulnerability is a recurring theme.",
    expert: "Recurring back-rank weakness.",
  },
};

export function patternAdvice(theme: string, rating: number): string {
  const band = bandFor(rating);
  return PATTERN_ADVICE[theme]?.[band] ?? "";
}

/** Whether a count over a game sample is worth reporting as a pattern. */
export function isPattern(occurrences: number, gamesConsidered: number): boolean {
  if (occurrences < PATTERN_MIN_OCCURRENCES) return false;
  // Also require it to be reasonably frequent: four times in two hundred games
  // is not a habit.
  return occurrences / Math.max(gamesConsidered, 1) >= 0.1;
}
