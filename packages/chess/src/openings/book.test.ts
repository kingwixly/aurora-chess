import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { lookupOpening, isBookPosition, isBookMove, identifyOpening, BOOK_SIZE } from "./book";

describe("the book", () => {
  it("holds the whole ECO set", () => {
    expect(BOOK_SIZE).toBeGreaterThan(3000);
  });

  it("names common openings", () => {
    const after = (sans: string[]) => {
      const c = new Chess();
      for (const s of sans) c.move(s);
      return c.fen();
    };
    expect(lookupOpening(after(["e4", "c5"]))?.name).toMatch(/Sicilian/i);
    expect(lookupOpening(after(["d4", "Nf6", "c4", "g6"]))?.name).toBeTruthy();
    expect(lookupOpening(after(["e4", "e5", "Nf3", "Nc6", "Bb5"]))?.name).toMatch(
      /Ruy Lopez|Spanish/i
    );
  });

  it("matches transpositions", () => {
    // Openings are reached in different move orders constantly. A book keyed by
    // move SEQUENCE would miss this; keying by position does not.
    // Same position, two move orders: 1.e4 c5 2.Nf3 and 1.Nf3 c5 2.e4.
    const viaOne = new Chess();
    ["e4", "c5", "Nf3"].forEach((m) => viaOne.move(m));
    const viaTwo = new Chess();
    ["Nf3", "c5", "e4"].forEach((m) => viaTwo.move(m));
    expect(lookupOpening(viaOne.fen())).toEqual(lookupOpening(viaTwo.fen()));
    expect(lookupOpening(viaOne.fen())).not.toBeNull();
  });

  it("keeps the most specific name as the line deepens", () => {
    // "Najdorf" is more useful than "King's Pawn Opening" once you are there.
    const shallow = identifyOpening(["e4", "c5"]);
    const deep = identifyOpening([
      "e4",
      "c5",
      "Nf3",
      "d6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "a6",
    ]);
    expect(deep.opening?.name).toMatch(/Najdorf/i);
    expect(deep.bookDepth).toBeGreaterThan(shallow.bookDepth);
  });

  it("reports where the game left the book", () => {
    const { bookDepth } = identifyOpening(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4"]);
    expect(bookDepth).toBeGreaterThan(4);
  });

  it("stops at an illegal move rather than throwing", () => {
    expect(() => identifyOpening(["e4", "e5", "Qxf7"])).not.toThrow();
  });
});

describe("book moves", () => {
  it("recognises a mainline first move", () => {
    // The reason this exists: an engine will call 1.e4 "excellent" and 1.d4
    // "good", which implies a difference that is not there and teaches nothing.
    const start = new Chess().fen();
    expect(isBookMove(start, "e4")).toBe(true);
    expect(isBookMove(start, "d4")).toBe(true);
    expect(isBookMove(start, "Nf3")).toBe(true);
  });

  it("recognises offbeat openings that are still named", () => {
    // The Grob is bad and it is still book — being in the book is a statement
    // about theory, not about quality.
    const start = new Chess().fen();
    expect(isBookMove(start, "g4")).toBe(true);
  });

  it("leaves the book when the line does", () => {
    const c = new Chess();
    ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O"].forEach((m) => c.move(m));
    // Deep enough into a real line that a random legal move is out of book.
    expect(isBookMove(c.fen(), "h6")).toBe(false);
  });

  it("returns false for an illegal move rather than throwing", () => {
    expect(isBookMove(new Chess().fen(), "Qh5")).toBe(false);
  });

  it("recognises the position after a book move", () => {
    const c = new Chess();
    c.move("e4");
    expect(isBookPosition(c.fen())).toBe(true);
  });
});
