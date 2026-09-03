import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import {
  VARIANTS,
  PLAYABLE_VARIANTS,
  needsFairyEngine,
  startingFenFor,
  explosionSquares,
  applyAtomicMove,
  atomicResult,
  HILL,
  hillWinner,
  countCheck,
  threeCheckWinner,
  antichessMoves,
  antichessResult,
  hordeResult,
  addToPocket,
  dropSquares,
  pocketIsEmpty,
  EMPTY_POCKET,
} from "./rules";

describe("the variant list", () => {
  it("describes every playable variant", () => {
    for (const v of PLAYABLE_VARIANTS) {
      const info = VARIANTS[v];
      expect(info, v).toBeTruthy();
      expect(info.rule.length, v).toBeGreaterThan(10);
      expect(info.winsBy.length, v).toBeGreaterThan(5);
      expect(info.uci, v).toBeTruthy();
    }
  });

  it("knows which need the variant engine", () => {
    // Chess960 is a shuffled start, not a rule change - plain Stockfish plays
    // it with UCI_Chess960, so pulling in Fairy for it would be wasteful.
    expect(needsFairyEngine("STANDARD")).toBe(false);
    expect(needsFairyEngine("CHESS960")).toBe(false);
    expect(needsFairyEngine("ATOMIC")).toBe(true);
    expect(needsFairyEngine("CRAZYHOUSE")).toBe(true);
  });

  it("only changes the starting position where the variant demands it", () => {
    expect(startingFenFor("ATOMIC")).toBeNull();
    expect(startingFenFor("THREECHECK")).toBeNull();
    // Not loaded through chess.js: Horde gives White no king, which chess.js
    // refuses to construct. The board field is what matters.
    const horde = startingFenFor("HORDE")!;
    expect(horde).toBeTruthy();
    expect(horde.split(" ")[0].split("/")).toHaveLength(8);
  });
});

describe("atomic", () => {
  it("destroys the neighbours of a capture", () => {
    const c = new Chess();
    c.move("e4");
    c.move("d5");
    // exd5 explodes on d5.
    const blast = explosionSquares(new Chess(c.fen()), "d5");
    expect(blast).toContain("d5");
  });

  it("spares pawns in the blast radius", () => {
    // Pawn structure surviving explosions is the defining feature of Atomic;
    // without it the game collapses in a few moves.
    const c = new Chess("4k3/8/8/2ppp3/3P4/8/8/4K3 w - - 0 1");
    const blast = explosionSquares(c, "c5");
    expect(blast).toContain("c5");
    expect(blast).not.toContain("d5");
  });

  it("removes the capturing piece too", () => {
    const before = "4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1";
    const res = applyAtomicMove(before, "e4", "d5");
    expect(res).not.toBeNull();
    const after = new Chess(res!.fen);
    // Both the pawn and the queen are gone.
    expect(after.get("d5")).toBeFalsy();
    expect(after.get("e4")).toBeFalsy();
  });

  it("refuses a capture that would destroy your own king", () => {
    // White rook on d1 takes the queen on d2. The white king on e1 is adjacent
    // to the blast, so the move destroys it and is therefore illegal - even
    // though it also removes Black's queen.
    const fen = "4k3/8/8/8/8/8/3q4/3RK3 w - - 0 1";
    expect(applyAtomicMove(fen, "d1", "d2")).toBeNull();
  });

  it("leaves quiet moves alone", () => {
    const res = applyAtomicMove(new Chess().fen(), "e2", "e4");
    expect(res).not.toBeNull();
    expect(res!.exploded).toEqual([]);
  });

  it("declares a winner when a king is gone", () => {
    expect(atomicResult("4k3/8/8/8/8/8/8/8 w - - 0 1")).toBe("black");
    expect(atomicResult("8/8/8/8/8/8/8/4K3 w - - 0 1")).toBe("white");
    expect(atomicResult(new Chess().fen())).toBeNull();
  });
});

describe("king of the hill", () => {
  it("uses the four central squares", () => {
    expect(HILL).toEqual(["d4", "d5", "e4", "e5"]);
  });

  it("wins the moment a king arrives", () => {
    expect(hillWinner("8/8/8/8/3K4/8/8/7k w - - 0 1")).toBe("white");
    expect(hillWinner("8/8/4k3/8/8/8/8/7K w - - 0 1")).toBeNull();
  });
});

describe("three-check", () => {
  it("counts checks given, not received", () => {
    const after = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    const counts = countCheck({ white: 0, black: 0 }, after, false);
    expect(counts.black).toBe(1);
    expect(counts.white).toBe(0);
  });

  it("ignores quiet moves", () => {
    const counts = countCheck({ white: 1, black: 0 }, new Chess().fen(), true);
    expect(counts.white).toBe(1);
  });

  it("wins at three", () => {
    expect(threeCheckWinner({ white: 3, black: 0 })).toBe("white");
    expect(threeCheckWinner({ white: 2, black: 2 })).toBeNull();
  });
});

describe("antichess", () => {
  it("forces a capture when one exists", () => {
    // This is the entire game. Without compulsory capture it is not Antichess.
    const fen = "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1";
    const moves = antichessMoves(fen);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.captured)).toBe(true);
  });

  it("allows anything when no capture is available", () => {
    const moves = antichessMoves(new Chess().fen());
    expect(moves.length).toBe(20);
  });

  it("wins by having nothing left", () => {
    expect(antichessResult("8/8/8/8/8/8/8/4K3 w - - 0 1")).toBe("black");
    expect(antichessResult("4k3/8/8/8/8/8/8/8 w - - 0 1")).toBe("white");
  });
});

describe("horde", () => {
  it("black wins by clearing every white pawn", () => {
    expect(hordeResult("4k3/8/8/8/8/8/8/8 w - - 0 1")).toBe("black");
  });

  it("is undecided while white has material", () => {
    expect(hordeResult(startingFenFor("HORDE")!)).toBeNull();
  });
});

describe("crazyhouse pockets", () => {
  it("starts empty", () => {
    expect(pocketIsEmpty(EMPTY_POCKET)).toBe(true);
  });

  it("adds a captured piece", () => {
    const p = addToPocket(EMPTY_POCKET, "n", false);
    expect(p.n).toBe(1);
    expect(pocketIsEmpty(p)).toBe(false);
  });

  it("returns a promoted piece as a pawn", () => {
    // A promoted queen was a pawn, and reverts on capture. Reading the type
    // off the board would hand out free queens.
    const p = addToPocket(EMPTY_POCKET, "q", true);
    expect(p.q).toBe(0);
    expect(p.p).toBe(1);
  });

  it("drops onto empty squares only", () => {
    const squares = dropSquares(new Chess().fen(), "n");
    expect(squares).toContain("e4");
    expect(squares).not.toContain("e2");
    expect(squares).not.toContain("e1");
  });

  it("keeps pawns off the back ranks", () => {
    // A pawn there could not have arrived legally and could never move.
    const squares = dropSquares("4k3/8/8/8/8/8/8/4K3 w - - 0 1", "p");
    expect(squares.some((s) => s.endsWith("1"))).toBe(false);
    expect(squares.some((s) => s.endsWith("8"))).toBe(false);
    expect(squares).toContain("e4");
  });
});
