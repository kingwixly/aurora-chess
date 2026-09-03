import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import {
  lookupOpening,
  isBookPosition,
  isBookMove,
  identifyOpening,
  shouldLabelAsBook,
  BOOK_SIZE,
} from "./book";

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
    // The Grob is bad and it is still book - being in the book is a statement
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

describe("book moves judge the move, not the game", () => {
  it("stops being book when the line leaves theory", () => {
    // The bug this guards: asking "does this game have an opening name?"
    // rather than "is this move still theory". The first is true forever once
    // you are a couple of moves in, so every later move was labelled book
    // however bad it was.
    const c = new Chess();
    for (const san of ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"]) c.move(san);

    // A pointless rook shuffle out of a real opening is not theory.
    expect(isBookMove(c.fen(), "Rf1g1")).toBe(false);
    expect(isBookMove(c.fen(), "Rg1")).toBe(false);
  });

  it("does not report the position before the move", () => {
    const c = new Chess();
    c.move("e4");
    c.move("e5");
    // The position here IS in the book. So is 2.a3 - that is Mengarini's
    // Opening, and being named is a statement about theory, not quality.
    expect(isBookPosition(c.fen())).toBe(true);
    // But a deep, pointless line is not, even though the game passed through
    // named openings on the way there.
    for (const san of ["Nf3", "Nc6", "Bc4", "Bc5", "h3", "h6", "a3"]) c.move(san);
    expect(isBookMove(c.fen(), "Rh2")).toBe(false);
  });

  it("returns false when the move does not apply at all", () => {
    // An unapplied move leaves the position unchanged, which would otherwise
    // report on the wrong position entirely.
    const c = new Chess();
    c.move("e4");
    expect(isBookMove(c.fen(), "")).toBe(false);
    expect(isBookMove(c.fen(), "Qxf7")).toBe(false);
  });
});

describe("when a book label is worth showing", () => {
  it("says nothing on the first move", () => {
    // Measured: all twenty of White's first moves are in the database,
    // including 1.a4 and 1.Na3. A label that applies to everything carries no
    // information, and because BOOK replaces the quality label it also
    // suppresses the feedback that would have been useful.
    const start = new Chess().fen();
    for (const m of ["e4", "d4", "a4", "Na3", "h4"]) {
      expect(shouldLabelAsBook(start, m, 1), m).toBe(false);
    }
  });

  it("applies from the second ply, where it distinguishes", () => {
    // 30% of legal replies are book at this point, so saying so means
    // something.
    const c = new Chess();
    c.move("e4");
    expect(shouldLabelAsBook(c.fen(), "c5", 2)).toBe(true);
  });

  it("still refuses a move that is not theory", () => {
    const c = new Chess();
    for (const san of ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "h3", "h6"]) c.move(san);
    expect(shouldLabelAsBook(c.fen(), "Rh2", 9)).toBe(false);
  });
});
