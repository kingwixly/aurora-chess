import { describe, it, expect } from "vitest";
import { RESULT_PGN, RESULT_LABELS, TERMINATION_LABELS } from "./types";

describe("RESULT_PGN", () => {
  it("maps WHITE_WIN to 1-0", () => {
    expect(RESULT_PGN.WHITE_WIN).toBe("1-0");
  });

  it("maps BLACK_WIN to 0-1", () => {
    expect(RESULT_PGN.BLACK_WIN).toBe("0-1");
  });

  it("maps DRAW to 1/2-1/2", () => {
    expect(RESULT_PGN.DRAW).toBe("1/2-1/2");
  });

  it("has exactly 3 entries", () => {
    expect(Object.keys(RESULT_PGN)).toHaveLength(3);
  });
});

describe("RESULT_LABELS", () => {
  it("has all 4 result keys", () => {
    expect(Object.keys(RESULT_LABELS)).toEqual(
      expect.arrayContaining(["WHITE_WIN", "BLACK_WIN", "DRAW", "ABORTED"])
    );
    expect(Object.keys(RESULT_LABELS)).toHaveLength(4);
  });

  it("has correct label values", () => {
    expect(RESULT_LABELS.WHITE_WIN).toBe("White wins");
    expect(RESULT_LABELS.BLACK_WIN).toBe("Black wins");
    expect(RESULT_LABELS.DRAW).toBe("Draw");
    expect(RESULT_LABELS.ABORTED).toBe("Game aborted");
  });
});

describe("TERMINATION_LABELS", () => {
  it("has all 4 termination keys", () => {
    expect(Object.keys(TERMINATION_LABELS)).toEqual(
      expect.arrayContaining(["CHECKMATE", "RESIGNATION", "TIMEOUT", "AGREEMENT"])
    );
    expect(Object.keys(TERMINATION_LABELS)).toHaveLength(4);
  });

  it("has correct label values", () => {
    expect(TERMINATION_LABELS.CHECKMATE).toBe("by checkmate");
    expect(TERMINATION_LABELS.RESIGNATION).toBe("by resignation");
    expect(TERMINATION_LABELS.TIMEOUT).toBe("on time");
    expect(TERMINATION_LABELS.AGREEMENT).toBe("by agreement");
  });
});
