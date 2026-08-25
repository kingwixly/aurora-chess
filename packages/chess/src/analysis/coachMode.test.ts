import { describe, it, expect } from "vitest";
import {
  COACHES,
  COACH_MIN,
  COACH_MAX,
  noiseFloorFor,
  depthForStrength,
  coachNote,
  clampStrength,
} from "./coachMode";

const base = {
  playedSan: "Nf3",
  bestSan: "e4",
  isBook: false,
};

describe("strength scaling", () => {
  it("is more forgiving at low ratings", () => {
    // A 700-rated player told about every 30-point inaccuracy learns to ignore
    // the coach, and a muted coach teaches nothing.
    expect(noiseFloorFor(700)).toBeGreaterThan(noiseFloorFor(2400));
  });

  it("searches deeper for stronger coaches", () => {
    expect(depthForStrength(700)).toBeLessThan(depthForStrength(3000));
  });

  it("clamps a requested strength into range", () => {
    expect(clampStrength(50)).toBe(COACH_MIN);
    expect(clampStrength(9000)).toBe(COACH_MAX);
    expect(clampStrength(Number.NaN)).toBeGreaterThanOrEqual(COACH_MIN);
  });
});

describe("when the coach speaks", () => {
  it("stays quiet about a small loss at low strength", () => {
    // Silence is a feature. Commenting on every move makes the coach noise.
    expect(coachNote({ ...base, cpLoss: 60, strength: 700 })).toBeNull();
  });

  it("speaks about the same loss at high strength", () => {
    expect(coachNote({ ...base, cpLoss: 60, strength: 2600 })).not.toBeNull();
  });

  it("says nothing about a forced move", () => {
    // There is nothing to learn from a move that had no alternative.
    expect(coachNote({ ...base, cpLoss: 400, strength: 1500, forced: true })).toBeNull();
  });

  it("names a book move without judging it", () => {
    const note = coachNote({ ...base, cpLoss: 0, strength: 1500, isBook: true })!;
    expect(note.quality).toBe("book");
    expect(note.betterMove).toBeNull();
  });

  it("escalates with the size of the error", () => {
    const at = (cp: number) => coachNote({ ...base, cpLoss: cp, strength: 1500 })?.quality;
    expect(at(80)).toBe("inaccuracy");
    expect(at(180)).toBe("mistake");
    expect(at(400)).toBe("blunder");
  });

  it("suggests the better move only when there is one worth naming", () => {
    expect(coachNote({ ...base, cpLoss: 400, strength: 1500 })?.betterMove).toBe("e4");
    expect(coachNote({ ...base, cpLoss: 2, strength: 1500 })?.betterMove).toBeNull();
  });
});

describe("personas", () => {
  it("offers coaches across the range", () => {
    expect(COACHES.length).toBeGreaterThanOrEqual(3);
    const strengths = COACHES.map((c) => c.suggestedStrength);
    expect(Math.min(...strengths)).toBeLessThan(1200);
    expect(Math.max(...strengths)).toBeGreaterThan(2000);
  });

  it("phrases the same verdict differently", () => {
    const patient = coachNote({ ...base, cpLoss: 400, strength: 1500, persona: "patient" })!;
    const direct = coachNote({ ...base, cpLoss: 400, strength: 1500, persona: "direct" })!;
    expect(patient.quality).toBe(direct.quality);
    expect(patient.message).not.toBe(direct.message);
  });

  it("always names the played move", () => {
    for (const p of ["patient", "direct", "analytical"]) {
      const n = coachNote({ ...base, cpLoss: 400, strength: 1500, persona: p })!;
      expect(n.message, p).toContain("Nf3");
    }
  });
});
