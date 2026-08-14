import { describe, it, expect } from "vitest";
import { bandFor, coachingText, isPattern, PATTERN_MIN_OCCURRENCES } from "./coaching";

describe("bands", () => {
  it("maps ratings to bands on the Glicko scale", () => {
    expect(bandFor(1000)).toBe("beginner");
    expect(bandFor(1500)).toBe("intermediate");
    expect(bandFor(1900)).toBe("advanced");
    expect(bandFor(2400)).toBe("expert");
  });
});

describe("coaching text", () => {
  it("says different things to different levels", () => {
    // The whole point: identical text for a 400 and a 1900 helps neither.
    expect(coachingText("blunder", 900)).not.toBe(coachingText("blunder", 2400));
  });

  it("tells a beginner what to actually check", () => {
    expect(coachingText("blunder", 900)).toMatch(/taken for free/i);
  });

  it("does not patronise a strong player", () => {
    expect(coachingText("blunder", 2400).length).toBeLessThan(coachingText("blunder", 900).length);
  });

  it("covers every quality at every band", () => {
    const qualities = [
      "brilliant",
      "great",
      "best",
      "good",
      "inaccuracy",
      "mistake",
      "blunder",
    ] as const;
    for (const q of qualities) {
      for (const r of [800, 1500, 1900, 2400]) {
        expect(coachingText(q, r)).toBeTruthy();
      }
    }
  });
});

describe("patterns", () => {
  it("needs enough occurrences", () => {
    expect(isPattern(PATTERN_MIN_OCCURRENCES - 1, 20)).toBe(false);
    expect(isPattern(PATTERN_MIN_OCCURRENCES, 20)).toBe(true);
  });

  it("needs the occurrences to be frequent, not just numerous", () => {
    // Four times in two hundred games is not a habit.
    expect(isPattern(4, 200)).toBe(false);
  });
});
