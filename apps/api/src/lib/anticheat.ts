/**
 * Cheat detection.
 *
 * The single most important property of this module: **it never punishes.** It
 * produces a suspicion score and a list of signals for a human to look at.
 *
 * That is not caution for its own sake. Accuracy statistics cannot distinguish
 * a cheat from a strong player having a good game — a forced sequence scores
 * 100% accuracy whoever plays it, and simple positions score high for everyone.
 * A system that bans on accuracy alone will ban improving players, which is
 * worse for a club than missing a cheat.
 *
 * Titled players and anyone staff have cleared are exempt outright: their
 * engine-like play is the thing the title certifies.
 */

export interface GameSignalInput {
  /** Accuracy for this game, 0-100. */
  accuracy: number;
  /** The player's mean accuracy over their recent history. */
  baselineAccuracy: number;
  /** How many games the baseline is drawn from. */
  baselineGames: number;
  /** Rating of this player. */
  rating: number;
  /** Rating of the opponent. */
  opponentRating: number;
  /** Rating gained over the player's recent history. */
  recentRatingGain: number;
  /** Mean time per move, ms. */
  meanMoveMs: number;
  /** Standard deviation of time per move, ms. */
  moveTimeStdDev: number;
  /** Number of moves in the game. */
  moves: number;
}

export interface CheatAssessment {
  /** 0-100. Higher means more worth a look. Not a probability. */
  score: number;
  signals: string[];
  detail: string;
}

/**
 * Minimum evidence before any judgement is made.
 *
 * Short games and thin histories produce meaningless statistics — a 12-move
 * miniature is 100% accurate for both players about a third of the time.
 */
const MIN_MOVES = 20;
const MIN_BASELINE_GAMES = 10;

/**
 * Assess one game.
 *
 * @param input - Game and player statistics.
 * @param exempt - Titled or staff-cleared. Always returns a zero score.
 */
export function assessGame(input: GameSignalInput, exempt: boolean): CheatAssessment {
  if (exempt) {
    return { score: 0, signals: [], detail: "Exempt from automated review." };
  }
  if (input.moves < MIN_MOVES || input.baselineGames < MIN_BASELINE_GAMES) {
    return {
      score: 0,
      signals: [],
      detail: "Not enough evidence: short game or thin history.",
    };
  }

  const signals: string[] = [];
  let score = 0;

  // Accuracy far above the player's own history. Compared against themselves
  // rather than an absolute bar, because "90% accuracy" means very different
  // things at 1200 and 2400.
  const lift = input.accuracy - input.baselineAccuracy;
  if (lift > 25 && input.accuracy > 90) {
    signals.push("accuracy-outlier");
    score += Math.min(35, Math.round(lift));
  } else if (lift > 15 && input.accuracy > 85) {
    signals.push("accuracy-elevated");
    score += 12;
  }

  // Beating a much stronger opponent *and* playing unlike yourself. Either
  // alone is unremarkable; together they are worth a look.
  if (input.opponentRating - input.rating > 300 && lift > 15) {
    signals.push("upset-with-lift");
    score += 20;
  }

  // Suspiciously even move times. A human thinks longer in complex positions
  // and moves instantly in forced ones; a low deviation across a long game
  // suggests the pace is being set by something other than the position.
  if (input.moves >= 30 && input.meanMoveMs > 800) {
    const cv = input.moveTimeStdDev / input.meanMoveMs;
    if (cv < 0.25) {
      signals.push("uniform-move-times");
      score += 25;
    } else if (cv < 0.4) {
      signals.push("low-time-variance");
      score += 10;
    }
  }

  // A very fast climb. Weak on its own — improvement is real and people do
  // return from a break — so it only contributes alongside something else.
  if (input.recentRatingGain > 400 && signals.length > 0) {
    signals.push("rapid-rating-gain");
    score += 15;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    signals,
    detail:
      signals.length === 0
        ? "Nothing unusual."
        : `Accuracy ${input.accuracy.toFixed(1)}% against a baseline of ${input.baselineAccuracy.toFixed(1)}% over ${input.baselineGames} games.`,
  };
}

/**
 * Whether a score is worth a staff member's time.
 *
 * Deliberately high. A queue full of weak flags gets ignored, and an ignored
 * queue is worse than no queue — it looks like oversight while providing none.
 */
export const REVIEW_THRESHOLD = 45;

export function needsReview(assessment: CheatAssessment): boolean {
  return assessment.score >= REVIEW_THRESHOLD;
}
