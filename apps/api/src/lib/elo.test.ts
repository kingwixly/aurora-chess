import { describe, it, expect } from "vitest";
import { computeElo } from "./elo.js";

describe("computeElo", () => {
  it("should increase winner rating and decrease loser rating for white win", () => {
    const result = computeElo(1200, 1200, "WHITE_WIN");
    expect(result.newWhiteRating).toBeGreaterThan(1200);
    expect(result.newBlackRating).toBeLessThan(1200);
  });

  it("should increase winner rating and decrease loser rating for black win", () => {
    const result = computeElo(1200, 1200, "BLACK_WIN");
    expect(result.newWhiteRating).toBeLessThan(1200);
    expect(result.newBlackRating).toBeGreaterThan(1200);
  });

  it("should not change ratings significantly for a draw between equal players", () => {
    const result = computeElo(1200, 1200, "DRAW");
    expect(result.newWhiteRating).toBe(1200);
    expect(result.newBlackRating).toBe(1200);
  });

  it("moves a new player's rating substantially on a win", () => {
    // Glicko-2 replaced Elo: with a default deviation of 350 the system knows
    // almost nothing about this player, so the first results move a long way.
    // That is the point of the change, not a regression.
    const result = computeElo(1500, 1500, "WHITE_WIN");
    expect(result.newWhiteRating - 1500).toBeGreaterThan(50);
  });

  it("moves a settled player's rating only slightly on the same win", () => {
    const result = computeElo(
      1500,
      1500,
      "WHITE_WIN",
      { deviation: 45, volatility: 0.06 },
      { deviation: 45, volatility: 0.06 }
    );
    expect(result.newWhiteRating - 1500).toBeLessThan(20);
  });

  it("accepts both result notations", () => {
    // Resignations and timeouts arrive as WHITE_WIN; everything else as 1-0.
    // Understanding only one silently scored resignations as draws.
    const pgn = computeElo(1500, 1500, "1-0");
    const enumForm = computeElo(1500, 1500, "WHITE_WIN");
    expect(pgn.newWhiteRating).toBe(enumForm.newWhiteRating);
  });

  it("should give more points for beating a higher-rated player", () => {
    const upset = computeElo(1000, 1400, "WHITE_WIN");
    const expected = computeElo(1200, 1200, "WHITE_WIN");
    const whiteGainUpset = upset.newWhiteRating - 1000;
    const whiteGainExpected = expected.newWhiteRating - 1200;
    expect(whiteGainUpset).toBeGreaterThan(whiteGainExpected);
  });

  it("gives fewer points for beating a lower-rated player", () => {
    // Compared at the same deviation on both sides: with default deviations a
    // 1400 is as uncertain as a 1000, so the gap alone drives the difference.
    const settled = { deviation: 45, volatility: 0.06 };
    const easy = computeElo(1400, 1000, "WHITE_WIN", settled, settled);
    const hard = computeElo(1400, 1800, "WHITE_WIN", settled, settled);
    expect(easy.newWhiteRating - 1400).toBeLessThan(hard.newWhiteRating - 1400);
  });

  it("should be symmetric: total rating change sums to zero", () => {
    const result = computeElo(1300, 1100, "WHITE_WIN");
    const totalChange = result.newWhiteRating - 1300 + (result.newBlackRating - 1100);
    expect(Math.abs(totalChange)).toBeLessThanOrEqual(1); // rounding
  });

  it("should handle large rating differences", () => {
    const result = computeElo(2000, 800, "WHITE_WIN");
    expect(result.newWhiteRating).toBeGreaterThanOrEqual(2000);
    expect(result.newBlackRating).toBeLessThanOrEqual(800);
  });

  it("big rating gap: underdog winning gains more than favorite losing", () => {
    const result = computeElo(2000, 1200, "BLACK_WIN");
    const blackGain = result.newBlackRating - 1200;
    const whiteLoss = 2000 - result.newWhiteRating;
    // Both should be large (near K=32) for such an upset
    expect(blackGain).toBeGreaterThan(25);
    expect(whiteLoss).toBeGreaterThan(25);
  });

  it("should penalize heavily for losing to much lower rated", () => {
    const result = computeElo(2000, 800, "BLACK_WIN");
    const whiteLoss = 2000 - result.newWhiteRating;
    expect(whiteLoss).toBeGreaterThan(25); // nearly full K
  });

  it("should handle draw between mismatched players", () => {
    const result = computeElo(1500, 1200, "DRAW");
    // Higher-rated player loses points, lower gains
    expect(result.newWhiteRating).toBeLessThan(1500);
    expect(result.newBlackRating).toBeGreaterThan(1200);
  });

  it("draw between equal players: both stay the same", () => {
    const result = computeElo(1500, 1500, "DRAW");
    expect(result.newWhiteRating).toBe(1500);
    expect(result.newBlackRating).toBe(1500);
  });

  it("ratings are rounded to integers", () => {
    const result = computeElo(1500, 1300, "WHITE_WIN");
    expect(Number.isInteger(result.newWhiteRating)).toBe(true);
    expect(Number.isInteger(result.newBlackRating)).toBe(true);
  });

  it("symmetry: swapping colors and result produces same magnitude change", () => {
    const r1 = computeElo(1600, 1400, "WHITE_WIN");
    const r2 = computeElo(1400, 1600, "BLACK_WIN");
    const whiteGain1 = r1.newWhiteRating - 1600;
    const blackGain2 = r2.newBlackRating - 1600;
    expect(whiteGain1).toBe(blackGain2);
  });
});
