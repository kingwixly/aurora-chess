import { describe, it, expect } from "vitest";
import { isBookMove, identifyOpening, lookupOpening, shouldLabelAsBook } from "./book";
import { countCheck, antichessMoves } from "../variants/rules";

describe("book and check counting survive bad input", () => {
  const nasty = ["", "not a fen", "8/8/8/8/8/8/8/8 w - - 0 1", "4k3/8/8/8/8/8/8/8 w - - 0 1"];

  it("never throws", () => {
    for (const fen of nasty) {
      expect(() => isBookMove(fen, "e4"), fen).not.toThrow();
      expect(() => lookupOpening(fen), fen).not.toThrow();
      expect(() => shouldLabelAsBook(fen, "e4", 3), fen).not.toThrow();
      expect(() => countCheck({ white: 0, black: 0 }, fen, true), fen).not.toThrow();
      expect(() => antichessMoves(fen), fen).not.toThrow();
    }
  });

  it("survives nonsense move lists", () => {
    expect(() => identifyOpening(["zz", "!!", ""])).not.toThrow();
    expect(() => identifyOpening([])).not.toThrow();
  });
});
