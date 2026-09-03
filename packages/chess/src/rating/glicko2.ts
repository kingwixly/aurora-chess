/**
 * Glicko-2.
 *
 * Replaces Elo because Elo has no idea how confident it is. A newcomer's 1200
 * and a veteran's 1200 are treated identically, so new players move far too
 * slowly and returning players are rated on stale evidence. Glicko-2 carries a
 * **deviation** (how uncertain the rating is) and a **volatility** (how erratic
 * the player's results are), which fixes both: uncertain ratings move fast,
 * settled ones move slowly, and inactivity widens uncertainty again.
 *
 * Implemented from Glickman's paper (glicko.net/glicko/glicko2.pdf). Values are
 * stored on the familiar 1500-centred scale and converted internally.
 */

/** Conversion constant between the display scale and Glicko-2's internal one. */
const SCALE = 173.7178;

/** Rating everyone starts at. */
export const DEFAULT_RATING = 1500;

/**
 * Starting deviation.
 *
 * 350 means "we know essentially nothing", which is correct for a new account
 * and is what lets the first handful of games move a rating hundreds of points.
 */
export const DEFAULT_DEVIATION = 350;

export const DEFAULT_VOLATILITY = 0.06;

/**
 * System constant τ, constraining volatility change over time.
 *
 * Glickman suggests 0.3–1.2; smaller is more conservative. 0.5 suits a club
 * where a genuine improvement should register without one upset rewriting
 * someone's rating.
 */
const TAU = 0.5;

/** Deviation is capped so an inactive player never becomes completely unknown. */
const MAX_DEVIATION = 350;
/** And floored, so an established rating cannot become absurdly confident. */
const MIN_DEVIATION = 30;

export interface Rating {
  rating: number;
  deviation: number;
  volatility: number;
}

export interface GameResult {
  opponent: Rating;
  /** 1 win, 0.5 draw, 0 loss. */
  score: number;
}

export function defaultRating(): Rating {
  return {
    rating: DEFAULT_RATING,
    deviation: DEFAULT_DEVIATION,
    volatility: DEFAULT_VOLATILITY,
  };
}

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));

const expected = (mu: number, muJ: number, phiJ: number) =>
  1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

/**
 * Solve for the new volatility using Illinois-variant regula falsi.
 *
 * This is the fiddly part of Glicko-2 and the reason most implementations get
 * it wrong: it is an iterative root find, not a formula.
 */
function newVolatility(phi: number, sigma: number, v: number, delta: number): number {
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * Math.pow(phi * phi + v + ex, 2);
    return num / den - (x - a) / (TAU * TAU);
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0 && k < 100) k++;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  let iterations = 0;

  while (Math.abs(B - A) > 1e-6 && iterations < 100) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
    iterations++;
  }

  return Math.exp(A / 2);
}

/**
 * Update a rating from a batch of results.
 *
 * Glicko-2 is designed around rating periods rather than single games. Passing
 * one result at a time works and is what a live site needs, but batching a
 * session's games gives a more accurate answer - hence the array.
 *
 * @param player - Current rating, deviation and volatility.
 * @param results - Games played this period.
 * @returns The updated rating, rounded for storage.
 */
export function updateRating(player: Rating, results: readonly GameResult[]): Rating {
  // No games: uncertainty grows, rating stands. This is what makes a rating
  // decay in confidence rather than in value while someone is away.
  if (results.length === 0) {
    const phi = player.deviation / SCALE;
    const phiStar = Math.sqrt(phi * phi + player.volatility * player.volatility);
    return {
      rating: player.rating,
      deviation: clampDeviation(phiStar * SCALE),
      volatility: player.volatility,
    };
  }

  const mu = (player.rating - DEFAULT_RATING) / SCALE;
  const phi = player.deviation / SCALE;

  let vInv = 0;
  let deltaSum = 0;

  for (const r of results) {
    const muJ = (r.opponent.rating - DEFAULT_RATING) / SCALE;
    const phiJ = r.opponent.deviation / SCALE;
    const gPhiJ = g(phiJ);
    const e = expected(mu, muJ, phiJ);
    vInv += gPhiJ * gPhiJ * e * (1 - e);
    deltaSum += gPhiJ * (r.score - e);
  }

  const v = 1 / vInv;
  const delta = v * deltaSum;

  const sigmaPrime = newVolatility(phi, player.volatility, v, delta);
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + vInv);
  const muPrime = mu + phiPrime * phiPrime * deltaSum;

  return {
    rating: Math.round(muPrime * SCALE + DEFAULT_RATING),
    deviation: clampDeviation(phiPrime * SCALE),
    volatility: Number(sigmaPrime.toFixed(6)),
  };
}

function clampDeviation(rd: number): number {
  return Math.round(Math.min(MAX_DEVIATION, Math.max(MIN_DEVIATION, rd)) * 100) / 100;
}

/** Convenience wrapper for a single game. */
export function updateFromGame(player: Rating, opponent: Rating, score: number): Rating {
  return updateRating(player, [{ opponent, score }]);
}

/**
 * Whether a rating is settled enough to publish or to award a title from.
 *
 * A 2400 with a deviation of 300 has not demonstrated 2400 - it has played
 * three games. Titles and leaderboards should wait for the evidence.
 */
export function isEstablished(r: Rating): boolean {
  return r.deviation <= 110;
}

/**
 * Conservative rating: what we are reasonably sure the player is at least.
 *
 * Two deviations below the estimate, which is the standard way to rank players
 * whose ratings carry different confidence without letting a lucky newcomer
 * top the leaderboard.
 */
export function conservativeRating(r: Rating): number {
  return Math.round(r.rating - 2 * r.deviation);
}
