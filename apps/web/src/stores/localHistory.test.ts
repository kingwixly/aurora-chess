import { describe, it, expect } from "vitest";
import { buildPgn } from "./localHistory";

describe("PGN export", () => {
  const base = {
    white: "Dani",
    black: "Sam",
    result: "1-0",
    termination: "checkmate",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    timeControl: "10+0",
    date: new Date("2026-08-26T12:00:00Z"),
  };

  it("includes the seven tag roster", () => {
    // Without it, most tools reject or mangle the file - a history that
    // exports records nothing else can read is not a history.
    const pgn = buildPgn(base);
    for (const tag of ["Event", "Site", "Date", "Round", "White", "Black", "Result"]) {
      expect(pgn, tag).toContain(`[${tag} "`);
    }
  });

  it("numbers moves in pairs", () => {
    expect(buildPgn(base)).toContain("1. e4 e5");
    expect(buildPgn(base)).toContain("2. Nf3 Nc6");
  });

  it("handles an odd number of moves", () => {
    const pgn = buildPgn(base);
    expect(pgn).toContain("3. Bb5");
    expect(pgn).not.toContain("3. Bb5 undefined");
  });

  it("ends with the result", () => {
    expect(buildPgn(base).trim().endsWith("1-0")).toBe(true);
  });

  it("escapes quotes in names", () => {
    // A name containing a quote would otherwise terminate the tag early and
    // produce a file no parser accepts.
    const pgn = buildPgn({ ...base, white: 'Da"ni' });
    expect(pgn).toContain('[White "Da\\"ni"]');
  });

  it("formats the date as PGN expects", () => {
    expect(buildPgn(base)).toContain('[Date "2026.08.26"]');
  });

  it("records how the game ended", () => {
    expect(buildPgn({ ...base, termination: "time" })).toContain('[Termination "time"]');
  });

  it("produces something for a game with no moves", () => {
    const pgn = buildPgn({ ...base, moves: [] });
    expect(pgn).toContain("[Result");
    expect(pgn.trim().endsWith("1-0")).toBe(true);
  });
});
