import { describe, it, expect } from "vitest";
import { assessGame, needsReview, REVIEW_THRESHOLD } from "./anticheat.js";

const base = {
  accuracy: 70,
  baselineAccuracy: 68,
  baselineGames: 40,
  rating: 1600,
  opponentRating: 1600,
  recentRatingGain: 20,
  meanMoveMs: 8000,
  moveTimeStdDev: 6000,
  moves: 40,
};

describe("exemptions", () => {
  it("scores nothing for an exempt player, however extreme the game", () => {
    // A titled player's engine-like accuracy is what the title certifies.
    const out = assessGame(
      { ...base, accuracy: 99, baselineAccuracy: 60, moveTimeStdDev: 100 },
      true
    );
    expect(out.score).toBe(0);
    expect(out.signals).toEqual([]);
  });
});

describe("evidence floors", () => {
  it("ignores short games", () => {
    // A 12-move miniature is often 100% accurate for both players.
    expect(assessGame({ ...base, moves: 12, accuracy: 100 }, false).score).toBe(0);
  });

  it("ignores players with a thin history", () => {
    expect(
      assessGame({ ...base, baselineGames: 3, accuracy: 99, baselineAccuracy: 50 }, false).score
    ).toBe(0);
  });
});

describe("signals", () => {
  it("says nothing about an ordinary game", () => {
    const out = assessGame(base, false);
    expect(out.score).toBe(0);
    expect(out.signals).toEqual([]);
  });

  it("flags accuracy far above the player's own history", () => {
    const out = assessGame({ ...base, accuracy: 96, baselineAccuracy: 65 }, false);
    expect(out.signals).toContain("accuracy-outlier");
    expect(out.score).toBeGreaterThan(20);
  });

  it("does not flag high accuracy that matches the player's history", () => {
    // A consistently strong player is not suspicious for being consistent.
    const out = assessGame({ ...base, accuracy: 94, baselineAccuracy: 92 }, false);
    expect(out.signals).not.toContain("accuracy-outlier");
  });

  it("flags uniform move times over a long game", () => {
    const out = assessGame({ ...base, moves: 45, meanMoveMs: 5000, moveTimeStdDev: 800 }, false);
    expect(out.signals).toContain("uniform-move-times");
  });

  it("treats a rating climb as corroboration, never as evidence alone", () => {
    // Improvement is real. On its own it must not raise the score at all.
    const out = assessGame({ ...base, recentRatingGain: 700 }, false);
    expect(out.signals).not.toContain("rapid-rating-gain");
    expect(out.score).toBe(0);
  });

  it("combines signals for a genuinely suspicious game", () => {
    const out = assessGame(
      {
        ...base,
        accuracy: 97,
        baselineAccuracy: 66,
        opponentRating: 2100,
        moves: 45,
        meanMoveMs: 5000,
        moveTimeStdDev: 700,
        recentRatingGain: 600,
      },
      false
    );
    expect(needsReview(out)).toBe(true);
    expect(out.signals.length).toBeGreaterThan(2);
  });
});

describe("review threshold", () => {
  it("is high enough that the queue stays readable", () => {
    // A queue full of weak flags gets ignored, and an ignored queue looks like
    // oversight while providing none.
    expect(REVIEW_THRESHOLD).toBeGreaterThanOrEqual(40);
  });

  it("never exceeds 100", () => {
    const out = assessGame(
      {
        ...base,
        accuracy: 100,
        baselineAccuracy: 30,
        opponentRating: 2600,
        moves: 60,
        meanMoveMs: 5000,
        moveTimeStdDev: 100,
        recentRatingGain: 900,
      },
      false
    );
    expect(out.score).toBeLessThanOrEqual(100);
  });
});
