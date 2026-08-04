import { describe, it, expect } from "vitest";
import { detectMoveSound } from "./useSound";

describe("detectMoveSound", () => {
  it("returns 'capture' for moves with a captured piece", () => {
    expect(detectMoveSound({ san: "exd5", captured: "p" })).toBe("capture");
  });

  it("returns 'check' for moves ending in +", () => {
    expect(detectMoveSound({ san: "Qh5+" })).toBe("check");
  });

  it("returns 'check' for checkmate moves ending in #", () => {
    expect(detectMoveSound({ san: "Qf7#" })).toBe("check");
  });

  it("returns 'castle' for O-O (kingside)", () => {
    expect(detectMoveSound({ san: "O-O" })).toBe("castle");
  });

  it("returns 'castle' for O-O-O (queenside)", () => {
    expect(detectMoveSound({ san: "O-O-O" })).toBe("castle");
  });

  it("returns 'castle' for moves with kingside castle flag", () => {
    expect(detectMoveSound({ san: "Kg1", flags: "k" })).toBe("castle");
  });

  it("returns 'castle' for moves with queenside castle flag", () => {
    expect(detectMoveSound({ san: "Kc1", flags: "q" })).toBe("castle");
  });

  it("returns 'move' for normal moves", () => {
    expect(detectMoveSound({ san: "e4" })).toBe("move");
  });

  it("returns 'move' for knight move", () => {
    expect(detectMoveSound({ san: "Nf3" })).toBe("move");
  });

  it("prioritizes check over capture", () => {
    expect(detectMoveSound({ san: "Qxf7+", captured: "p" })).toBe("check");
  });
});
