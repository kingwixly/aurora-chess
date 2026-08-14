import { describe, it, expect } from "vitest";
import { isMatePuzzle, solverPly, checkPuzzleMove, puzzleRatingChange } from "./types";
import type { PuzzleData } from "./types";

const mateIn1: PuzzleData = {
  id: "m1",
  fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
  rating: 700,
  title: "Back rank",
  intro: "Mate.",
  themes: ["backRankMate", "mateIn1"],
  moves: ["a1a8"],
  explanations: ["Ra8#."],
};

const multi: PuzzleData = {
  id: "m2",
  fen: "6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1",
  rating: 1400,
  title: "Ladder",
  intro: "Mate in two.",
  themes: ["mateIn2", "endgame"],
  moves: ["b1b7", "g8f8", "a2a8"],
  explanations: ["Cut off the rank.", "Forced.", "Ra8#."],
};

const tactic: PuzzleData = {
  id: "t1",
  fen: "r3k2r/ppp2ppp/8/3N4/8/8/PPP2PPP/R3K2R w KQkq - 0 1",
  rating: 900,
  title: "Fork",
  intro: "Win material.",
  themes: ["fork", "knightFork"],
  moves: ["d5c7"],
  explanations: ["Nc7+ forks."],
};

describe("isMatePuzzle", () => {
  it("recognises mate themes in both naming styles", () => {
    expect(isMatePuzzle(["mateIn1"])).toBe(true);
    expect(isMatePuzzle(["backRankMate"])).toBe(true);
    expect(isMatePuzzle(["smotheredMate", "endgame"])).toBe(true);
    expect(isMatePuzzle(["fork", "pin"])).toBe(false);
  });
});

describe("checkPuzzleMove", () => {
  it("accepts the stored move", () => {
    expect(checkPuzzleMove(mateIn1, 0, "a1a8", true).status).toBe("solved");
  });

  it("accepts ANY mate on a mate puzzle", () => {
    // The Arabian position has two distinct mates in one. Rejecting the one
    // that is not stored would be telling a solver their mate is wrong.
    const r = checkPuzzleMove(mateIn1, 0, "a1a7", true);
    expect(r.status).toBe("solved");
  });

  it("does not accept a non-mating move on a mate puzzle", () => {
    expect(checkPuzzleMove(mateIn1, 0, "a1a5", false).status).toBe("wrong");
  });

  it("requires the exact move on a non-mate puzzle", () => {
    // Without a mate to check against, there is no way to tell a brilliant
    // alternative from a blunder, so the stored line is the standard.
    expect(checkPuzzleMove(tactic, 0, "d5c7", false).status).toBe("solved");
    expect(checkPuzzleMove(tactic, 0, "d5f6", false).status).toBe("wrong");
  });

  it("continues a multi-move puzzle and returns the reply", () => {
    const r = checkPuzzleMove(multi, 0, "b1b7", false);
    expect(r.status).toBe("continue");
    if (r.status === "continue") {
      expect(r.reply).toBe("g8f8");
      expect(r.explanation).toBe("Cut off the rank.");
      expect(r.replyExplanation).toBe("Forced.");
    }
  });

  it("solves on the final move of a multi-move puzzle", () => {
    expect(checkPuzzleMove(multi, 1, "a2a8", true).status).toBe("solved");
  });

  it("ends early when the solver finds a faster mate", () => {
    // Someone who mates on move one of a mate-in-two has still solved it.
    expect(checkPuzzleMove(multi, 0, "a2a8", true).status).toBe("solved");
  });

  it("returns wrong rather than throwing past the end of the line", () => {
    expect(checkPuzzleMove(mateIn1, 5, "a1a8", true).status).toBe("wrong");
  });
});

describe("solverPly", () => {
  it("maps solver moves to even indices", () => {
    expect(solverPly(0)).toBe(0);
    expect(solverPly(1)).toBe(2);
    expect(solverPly(2)).toBe(4);
  });
});

describe("puzzleRatingChange", () => {
  const settled = { rating: 2000, deviation: 50, volatility: 0.06 };
  const fresh = { rating: 1500, deviation: 350, volatility: 0.06 };

  it("gains little for a settled player solving an easy puzzle", () => {
    const out = puzzleRatingChange(settled, 1000, true);
    expect(out.rating).toBeGreaterThanOrEqual(2000);
    expect(out.rating - 2000).toBeLessThan(5);
  });

  it("gains a lot for solving well above your rating", () => {
    const out = puzzleRatingChange(settled, 2600, true);
    expect(out.rating - 2000).toBeGreaterThan(10);
  });

  it("loses for failing an easy puzzle", () => {
    expect(puzzleRatingChange(settled, 1000, false).rating).toBeLessThan(2000);
  });

  it("moves a new solver much faster than a settled one", () => {
    // The point of Glicko-2 here: finding your puzzle level should take a
    // handful of puzzles, not dozens.
    const freshGain = puzzleRatingChange(fresh, 1500, true).rating - 1500;
    const settledGain =
      puzzleRatingChange({ rating: 1500, deviation: 50, volatility: 0.06 }, 1500, true).rating -
      1500;
    expect(freshGain).toBeGreaterThan(settledGain * 3);
  });

  it("narrows uncertainty as puzzles are attempted", () => {
    const out = puzzleRatingChange(fresh, 1500, true);
    expect(out.deviation).toBeLessThan(fresh.deviation);
  });
});
