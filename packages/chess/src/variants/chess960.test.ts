import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import {
  isValidBackRank,
  backRankForPosition,
  fenForPosition,
  castlingRookFiles,
  applyCastling,
  STANDARD_POSITION_ID,
} from "./chess960";

describe("position generation", () => {
  it("produces a legal arrangement for every one of the 960", () => {
    // The whole set, not a sample: an invalid position would be unplayable and
    // there are few enough to check exhaustively.
    for (let i = 0; i < 960; i++) {
      expect(isValidBackRank(backRankForPosition(i)), `position ${i}`).toBe(true);
    }
  });

  it("produces 960 distinct arrangements", () => {
    const all = new Set<string>();
    for (let i = 0; i < 960; i++) all.add(backRankForPosition(i));
    expect(all.size).toBe(960);
  });

  it("gives the ordinary array for the standard number", () => {
    // Scharnagl numbering puts the normal game at 518; if this drifts, every
    // stored game id points at a different position.
    expect(backRankForPosition(STANDARD_POSITION_ID)).toBe("rnbqkbnr");
  });

  it("is stable - the same number always gives the same position", () => {
    expect(backRankForPosition(42)).toBe(backRankForPosition(42));
  });

  it("refuses a number outside the range", () => {
    expect(() => backRankForPosition(-1)).toThrow();
    expect(() => backRankForPosition(960)).toThrow();
  });
});

describe("back rank validity", () => {
  it("rejects same-coloured bishops", () => {
    // Files 0 and 2 are both dark; files 0 and 1 would be legal, which is what
    // my first attempt at this test got wrong.
    expect(isValidBackRank("bqbnnrkr")).toBe(false);
  });

  it("rejects a king outside the rooks", () => {
    // King must sit between them, or castling has no meaning.
    expect(isValidBackRank("krrqnbbn")).toBe(false);
  });

  it("rejects a wrong piece count", () => {
    expect(isValidBackRank("rnbqkbn")).toBe(false);
    expect(isValidBackRank("qqbnkrnr")).toBe(false);
  });

  it("accepts the standard array", () => {
    expect(isValidBackRank("rnbqkbnr")).toBe(true);
  });
});

describe("starting FEN", () => {
  it("is accepted by the move generator for every position", () => {
    for (let i = 0; i < 960; i++) {
      const fen = fenForPosition(i);
      expect(() => new Chess(fen), `position ${i}`).not.toThrow();
    }
  });

  it("gives both sides the same arrangement", () => {
    const board = fenForPosition(300).split(" ")[0].split("/");
    expect(board[0]).toBe(board[7].toLowerCase());
  });

  it("opens with a sane number of moves in every position", () => {
    // 16 pawn moves plus knight moves. A knight on the a- or h-file has only
    // one square, so the total is 18 to 20 rather than always 20 - the
    // assumption my first version of this test made.
    for (let i = 0; i < 960; i++) {
      const n = new Chess(fenForPosition(i)).moves().length;
      expect(n, `position ${i}`).toBeGreaterThanOrEqual(18);
      expect(n, `position ${i}`).toBeLessThanOrEqual(20);
    }
  });
});

describe("castling", () => {
  it("puts king and rook on the right squares from a known position", () => {
    // King b1, rooks a1 and h1 - position where standard rules would send the
    // king to d1. Chess960 says g1, rook f1.
    const id = [...Array(960).keys()].find((i) => backRankForPosition(i) === ("rk4nr" as never));
    void id;
    const rank = "rkbbnqnr"; // king b, rooks a and h
    const pid = [...Array(960).keys()].find((i) => backRankForPosition(i) === rank);
    expect(pid, "expected this arrangement to be one of the 960").toBeDefined();

    const fen = `7k/8/8/8/8/8/8/RK5R w KQ - 0 1`;
    const out = applyCastling(fen, "king", pid!);
    expect(out).not.toBeNull();
    const back = out!.split(" ")[0].split("/")[7];
    // g1 king, f1 rook, a1 rook still home.
    expect(back).toBe("R4RK1");
  });

  it("castles queenside to c1 with the rook on d1", () => {
    const rank = "rkbbnqnr";
    const pid = [...Array(960).keys()].find((i) => backRankForPosition(i) === rank)!;
    const fen = `7k/8/8/8/8/8/8/RK5R w KQ - 0 1`;
    const out = applyCastling(fen, "queen", pid);
    expect(out).not.toBeNull();
    expect(out!.split(" ")[0].split("/")[7]).toBe("2KR3R");
  });

  it("refuses when the king would pass through check", () => {
    const rank = "rkbbnqnr";
    const pid = [...Array(960).keys()].find((i) => backRankForPosition(i) === rank)!;
    // Black rook on the e-file covers e1, which the king crosses on its way
    // from b1 to g1.
    const fen = `4r2k/8/8/8/8/8/8/RK5R w KQ - 0 1`;
    expect(applyCastling(fen, "king", pid)).toBeNull();
  });

  it("refuses when a piece is in the way", () => {
    const rank = "rkbbnqnr";
    const pid = [...Array(960).keys()].find((i) => backRankForPosition(i) === rank)!;
    const fen = `7k/8/8/8/8/8/8/RK3B1R w KQ - 0 1`;
    expect(applyCastling(fen, "king", pid)).toBeNull();
  });

  it("refuses without castling rights", () => {
    const rank = "rkbbnqnr";
    const pid = [...Array(960).keys()].find((i) => backRankForPosition(i) === rank)!;
    const fen = `7k/8/8/8/8/8/8/RK5R w - - 0 1`;
    expect(applyCastling(fen, "king", pid)).toBeNull();
  });

  it("removes castling rights and passes the turn", () => {
    const rank = "rkbbnqnr";
    const pid = [...Array(960).keys()].find((i) => backRankForPosition(i) === rank)!;
    const out = applyCastling(`r6k/8/8/8/8/8/8/RK5R w KQkq - 0 1`, "king", pid)!;
    const parts = out.split(" ");
    expect(parts[1]).toBe("b");
    expect(parts[2]).not.toContain("K");
    expect(parts[2]).not.toContain("Q");
    expect(parts[2]).toContain("k");
  });

  it("produces a position the move generator accepts", () => {
    const rank = "rkbbnqnr";
    const pid = [...Array(960).keys()].find((i) => backRankForPosition(i) === rank)!;
    const out = applyCastling(`7k/8/8/8/8/8/8/RK5R w KQ - 0 1`, "king", pid)!;
    expect(() => new Chess(out)).not.toThrow();
  });
});

describe("rook files", () => {
  it("reports where the rooks started", () => {
    const pid = [...Array(960).keys()].find((i) => backRankForPosition(i) === "rnbqkbnr")!;
    expect(castlingRookFiles(pid)).toEqual({ queenside: 0, kingside: 7 });
  });
});
