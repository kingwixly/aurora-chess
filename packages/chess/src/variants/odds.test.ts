import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import {
  ODDS,
  suggestOdds,
  fenForOdds,
  freeMovesForOdds,
  timeMultiplierForOdds,
  affectsRating,
  ODDS_SUGGESTION_THRESHOLD,
} from "./odds";

describe("suggestions", () => {
  it("suggests nothing for a close pairing", () => {
    // Odds on an even game would be an insult, not a courtesy.
    expect(suggestOdds(1600, 1550)).toHaveLength(0);
    expect(suggestOdds(1600, 1600 - ODDS_SUGGESTION_THRESHOLD + 1)).toHaveLength(0);
  });

  it("suggests something once the gap is wide", () => {
    expect(suggestOdds(2100, 1200).length).toBeGreaterThan(0);
  });

  it("puts the closest match first", () => {
    // A 1000-point gap should lead with queen odds, not a pawn.
    expect(suggestOdds(2200, 1200)[0].kind).toBe("queen");
    // A 500-point gap should lead with the knight.
    expect(suggestOdds(1700, 1200)[0].kind).toBe("knight");
  });

  it("never suggests 'none'", () => {
    for (const o of suggestOdds(2400, 1000)) expect(o.kind).not.toBe("none");
  });
});

describe("material odds", () => {
  it("removes the piece from the STRONGER player", () => {
    // Black receives the handicap, so White - the stronger side - loses the
    // queen. Taking it from the wrong player would double the mismatch.
    const fen = fenForOdds("queen", "black")!;
    const board = fen.split(" ")[0];
    expect(board.split("/")[7]).not.toContain("Q");
    expect(board.split("/")[0]).toContain("q");
  });

  it("removes from black when white receives", () => {
    const fen = fenForOdds("queen", "white")!;
    const board = fen.split(" ")[0];
    expect(board.split("/")[0]).not.toContain("q");
    expect(board.split("/")[7]).toContain("Q");
  });

  it("produces a position the move generator accepts", () => {
    for (const kind of ["pawn-f7", "knight", "rook", "queen"] as const) {
      for (const receiver of ["white", "black"] as const) {
        const fen = fenForOdds(kind, receiver)!;
        expect(() => new Chess(fen), `${kind} / ${receiver}`).not.toThrow();
      }
    }
  });

  it("strips the castling right when the rook is removed", () => {
    // A FEN claiming a castling right whose rook is gone is rejected by strict
    // parsers, and chess.js is one of them.
    const fen = fenForOdds("rook", "black")!;
    expect(fen.split(" ")[2]).not.toContain("Q");
    expect(() => new Chess(fen)).not.toThrow();
  });

  it("returns null for odds that do not change the position", () => {
    expect(fenForOdds("two-moves", "white")).toBeNull();
    expect(fenForOdds("time-double", "white")).toBeNull();
    expect(fenForOdds("none", "white")).toBeNull();
  });
});

describe("move and time odds", () => {
  it("reports the number of free moves", () => {
    expect(freeMovesForOdds("two-moves")).toBe(2);
    expect(freeMovesForOdds("three-moves")).toBe(3);
    expect(freeMovesForOdds("queen")).toBe(0);
  });

  it("reports the clock multiplier", () => {
    expect(timeMultiplierForOdds("time-double")).toBe(2);
    expect(timeMultiplierForOdds("time-triple")).toBe(3);
    expect(timeMultiplierForOdds("knight")).toBe(1);
  });
});

describe("rating", () => {
  it("never rates an odds game", () => {
    // A rating describes even play. Results from a handicap game describe the
    // handicap, and mixing them corrupts the number for both players.
    for (const kind of Object.keys(ODDS)) {
      if (kind === "none") continue;
      expect(affectsRating(kind as never), kind).toBe(false);
    }
  });

  it("rates a game with no odds", () => {
    expect(affectsRating("none")).toBe(true);
  });
});

describe("definitions", () => {
  it("describes every kind in plain language", () => {
    for (const [kind, def] of Object.entries(ODDS)) {
      expect(def.label, kind).toBeTruthy();
      expect(def.description.length, kind).toBeGreaterThan(10);
    }
  });

  it("orders worth sensibly", () => {
    expect(ODDS.queen.worth).toBeGreaterThan(ODDS.rook.worth);
    expect(ODDS.rook.worth).toBeGreaterThan(ODDS.knight.worth);
    expect(ODDS.knight.worth).toBeGreaterThan(ODDS["pawn-f7"].worth);
  });
});
