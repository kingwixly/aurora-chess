import { describe, it, expect } from "vitest";
import { didPlayerWin, didPlayerLose, isDrawResult } from "./helpers";
import type { GameResult } from "./types";

describe("didPlayerWin", () => {
  it("returns true when white player wins with WHITE_WIN", () => {
    expect(didPlayerWin(true, "WHITE_WIN")).toBe(true);
  });

  it("returns false when black player faces WHITE_WIN", () => {
    expect(didPlayerWin(false, "WHITE_WIN")).toBe(false);
  });

  it("returns true when black player wins with BLACK_WIN", () => {
    expect(didPlayerWin(false, "BLACK_WIN")).toBe(true);
  });

  it("returns false when white player faces BLACK_WIN", () => {
    expect(didPlayerWin(true, "BLACK_WIN")).toBe(false);
  });

  it("returns false for DRAW regardless of color", () => {
    expect(didPlayerWin(true, "DRAW")).toBe(false);
    expect(didPlayerWin(false, "DRAW")).toBe(false);
  });

  it("returns false for ABORTED regardless of color", () => {
    expect(didPlayerWin(true, "ABORTED")).toBe(false);
    expect(didPlayerWin(false, "ABORTED")).toBe(false);
  });
});

describe("didPlayerLose", () => {
  it("returns true when white player faces BLACK_WIN", () => {
    expect(didPlayerLose(true, "BLACK_WIN")).toBe(true);
  });

  it("returns false when black player faces BLACK_WIN", () => {
    expect(didPlayerLose(false, "BLACK_WIN")).toBe(false);
  });

  it("returns true when black player faces WHITE_WIN", () => {
    expect(didPlayerLose(false, "WHITE_WIN")).toBe(true);
  });

  it("returns false when white player faces WHITE_WIN", () => {
    expect(didPlayerLose(true, "WHITE_WIN")).toBe(false);
  });

  it("returns false for DRAW regardless of color", () => {
    expect(didPlayerLose(true, "DRAW")).toBe(false);
    expect(didPlayerLose(false, "DRAW")).toBe(false);
  });

  it("returns false for ABORTED regardless of color", () => {
    expect(didPlayerLose(true, "ABORTED")).toBe(false);
    expect(didPlayerLose(false, "ABORTED")).toBe(false);
  });
});

describe("didPlayerLose is inverse of didPlayerWin for non-draw results", () => {
  const nonDrawResults: GameResult[] = ["WHITE_WIN", "BLACK_WIN"];

  for (const result of nonDrawResults) {
    for (const isWhite of [true, false]) {
      it(`isWhite=${isWhite}, result=${result}: win and lose are mutually exclusive`, () => {
        const won = didPlayerWin(isWhite, result);
        const lost = didPlayerLose(isWhite, result);
        expect(won).not.toBe(lost);
      });
    }
  }
});

describe("isDrawResult", () => {
  it("returns true for DRAW", () => {
    expect(isDrawResult("DRAW")).toBe(true);
  });

  it("returns false for WHITE_WIN", () => {
    expect(isDrawResult("WHITE_WIN")).toBe(false);
  });

  it("returns false for BLACK_WIN", () => {
    expect(isDrawResult("BLACK_WIN")).toBe(false);
  });

  it("returns false for ABORTED", () => {
    expect(isDrawResult("ABORTED")).toBe(false);
  });
});

describe("exhaustive combinations of isWhite x result", () => {
  const results: GameResult[] = ["WHITE_WIN", "BLACK_WIN", "DRAW", "ABORTED"];
  const players = [true, false];

  const expected: Record<string, { win: boolean; lose: boolean }> = {
    true_WHITE_WIN: { win: true, lose: false },
    true_BLACK_WIN: { win: false, lose: true },
    true_DRAW: { win: false, lose: false },
    true_ABORTED: { win: false, lose: false },
    false_WHITE_WIN: { win: false, lose: true },
    false_BLACK_WIN: { win: true, lose: false },
    false_DRAW: { win: false, lose: false },
    false_ABORTED: { win: false, lose: false },
  };

  for (const isWhite of players) {
    for (const result of results) {
      const key = `${isWhite}_${result}`;
      it(`isWhite=${isWhite}, result=${result}`, () => {
        expect(didPlayerWin(isWhite, result)).toBe(expected[key].win);
        expect(didPlayerLose(isWhite, result)).toBe(expected[key].lose);
      });
    }
  }
});
