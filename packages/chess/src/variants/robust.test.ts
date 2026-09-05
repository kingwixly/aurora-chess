import { describe, it, expect } from "vitest";
import {
  atomicResult,
  hordeResult,
  antichessResult,
  hillWinner,
  applyAtomicMove,
  countPieces,
  startingFenFor,
  explosionSquares,
  dropSquares,
} from "./rules";
import { Chess } from "chess.js";

/**
 * These run on live boards, where an exception ends someone's game.
 *
 * Every one of them takes a FEN from somewhere else - the server, a stored
 * game, an engine - so they must survive input they did not construct.
 */
describe("variant rules survive bad input", () => {
  const nasty = [
    "",
    "not a fen",
    "8/8/8/8/8/8/8/8 w - - 0 1",
    "4k3/8/8/8/8/8/8/8 w - - 0 1",
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  ];

  it("never throws from a result function", () => {
    for (const fen of nasty) {
      expect(() => atomicResult(fen), `atomic: ${fen}`).not.toThrow();
      expect(() => hordeResult(fen), `horde: ${fen}`).not.toThrow();
      expect(() => antichessResult(fen), `antichess: ${fen}`).not.toThrow();
      expect(() => hillWinner(fen), `hill: ${fen}`).not.toThrow();
    }
  });

  it("never throws from applyAtomicMove", () => {
    for (const fen of nasty) {
      expect(() => applyAtomicMove(fen, "e2" as never, "e4" as never)).not.toThrow();
    }
  });

  it("counts pieces in a kingless position", () => {
    // The case chess.js refuses outright, and the reason these parse FENs
    // directly rather than loading them.
    const c = countPieces("8/8/8/8/8/8/8/8 w - - 0 1");
    expect(c.whiteTotal).toBe(0);
    expect(c.blackTotal).toBe(0);
  });

  it("reads the horde start correctly", () => {
    const c = countPieces(startingFenFor("HORDE")!);
    // White has no king in Horde. If this ever becomes 1, the position is wrong.
    expect(c.white.k ?? 0).toBe(0);
    expect(c.black.k).toBe(1);
    expect(c.whiteTotal).toBeGreaterThan(30);
  });

  it("keeps explosions on the board", () => {
    // A corner capture must not produce squares like "i9" or "a0".
    const c = new Chess();
    for (const sq of ["a1", "h8", "a8", "h1"] as const) {
      for (const s of explosionSquares(c, sq)) {
        expect(s).toMatch(/^[a-h][1-8]$/);
      }
    }
  });

  it("never offers an occupied square for a drop", () => {
    const fen = new Chess().fen();
    const chess = new Chess(fen);
    for (const sq of dropSquares(fen, "n")) {
      expect(chess.get(sq), sq).toBeFalsy();
    }
  });
});
