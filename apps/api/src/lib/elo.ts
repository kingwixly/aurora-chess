import { updateFromGame, type Rating } from "@aurora/chess";

/**
 * Rating update for a completed game.
 *
 * Glicko-2 rather than Elo: Elo treats a newcomer's 1500 and a veteran's 1500
 * identically, so new players take dozens of games to reach their real level
 * and returning players are judged on stale evidence. Glicko-2 carries the
 * uncertainty explicitly.
 *
 * The signature is kept compatible with the old `computeElo` so the game-end
 * hook did not have to be rewritten around it.
 */
/**
 * Normalise a result to white's score.
 *
 * Two notations are in circulation: PGN (`1-0`) and the enum form
 * (`WHITE_WIN`). Resignations and timeouts use the latter, so a function that
 * only understood PGN scored every resignation as a draw and left both ratings
 * untouched. Accepting both is the fix; the test that caught it is in
 * elo.test.ts.
 */
function whiteScoreFor(result: string): number {
  const r = result.trim().toUpperCase();
  if (r === "1-0" || r === "WHITE_WIN") return 1;
  if (r === "0-1" || r === "BLACK_WIN") return 0;
  return 0.5;
}

export function computeElo(
  whiteRating: number,
  blackRating: number,
  result: string,
  white: { deviation?: number; volatility?: number } = {},
  black: { deviation?: number; volatility?: number } = {}
): {
  newWhiteRating: number;
  newBlackRating: number;
  whiteDeviation: number;
  blackDeviation: number;
  whiteVolatility: number;
  blackVolatility: number;
} {
  const w: Rating = {
    rating: whiteRating,
    deviation: white.deviation ?? 350,
    volatility: white.volatility ?? 0.06,
  };
  const b: Rating = {
    rating: blackRating,
    deviation: black.deviation ?? 350,
    volatility: black.volatility ?? 0.06,
  };

  const whiteScore = whiteScoreFor(result);

  // Both updates read the opponent's PRE-game rating, which is what Glicko-2
  // specifies. Updating sequentially would let the first result contaminate the
  // second.
  const nw = updateFromGame(w, b, whiteScore);
  const nb = updateFromGame(b, w, 1 - whiteScore);

  return {
    newWhiteRating: nw.rating,
    newBlackRating: nb.rating,
    whiteDeviation: nw.deviation,
    blackDeviation: nb.deviation,
    whiteVolatility: nw.volatility,
    blackVolatility: nb.volatility,
  };
}
