import { describe, it, expect } from "vitest";
import {
  CONCURRENT_LIMIT,
  concurrentLimitFor,
  countsTowardLimit,
  canAcceptChallenge,
  actionsForChallenge,
} from "./concurrency";

describe("limits", () => {
  it("caps an ordinary account", () => {
    expect(concurrentLimitFor({})).toBe(CONCURRENT_LIMIT);
  });

  it("exempts titled players", () => {
    // Simultaneous exhibitions are normal for a titled player, and the limit
    // would make them impossible.
    expect(concurrentLimitFor({ title: "GM" })).toBe(Number.POSITIVE_INFINITY);
    expect(concurrentLimitFor({ isTitled: true })).toBe(Number.POSITIVE_INFINITY);
  });

  it("does not count correspondence games", () => {
    // Twenty daily games is a hobby, not a load problem.
    expect(countsTowardLimit("CORRESPONDENCE")).toBe(false);
    expect(countsTowardLimit("DAILY")).toBe(false);
    expect(countsTowardLimit("BLITZ")).toBe(true);
    expect(countsTowardLimit("blitz")).toBe(true);
  });
});

describe("accepting", () => {
  it("allows a free player", () => {
    expect(canAcceptChallenge({ activeRealtimeGames: 0 }).allowed).toBe(true);
  });

  it("allows up to the limit", () => {
    expect(canAcceptChallenge({ activeRealtimeGames: CONCURRENT_LIMIT - 1 }).allowed).toBe(true);
  });

  it("refuses past the limit", () => {
    const d = canAcceptChallenge({ activeRealtimeGames: CONCURRENT_LIMIT });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.reason).toBe("at-limit");
  });

  it("lets a titled player past it", () => {
    expect(canAcceptChallenge({ activeRealtimeGames: 40, title: "IM" }).allowed).toBe(true);
  });

  it("refuses a second game against the same opponent", () => {
    // Almost always a double-click rather than an intention.
    const d = canAcceptChallenge({ activeRealtimeGames: 1, alreadyPlayingOpponent: true });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.reason).toBe("already-playing-them");
  });
});

describe("what to offer", () => {
  it("offers play-now to someone who is free", () => {
    expect(actionsForChallenge({ activeRealtimeGames: 0 })).toEqual(["play-now", "decline"]);
  });

  it("offers queuing to someone mid-game", () => {
    expect(actionsForChallenge({ activeRealtimeGames: 2 })).toContain("queue");
    expect(actionsForChallenge({ activeRealtimeGames: 2 })).toContain("play-now");
  });

  it("still offers queuing at the limit", () => {
    // Declining because you are momentarily busy loses the game entirely, and
    // people rarely come back to re-challenge.
    const actions = actionsForChallenge({ activeRealtimeGames: CONCURRENT_LIMIT });
    expect(actions).toContain("queue");
    expect(actions).not.toContain("play-now");
  });

  it("only offers decline for a duplicate pairing", () => {
    expect(actionsForChallenge({ activeRealtimeGames: 1, alreadyPlayingOpponent: true })).toEqual([
      "decline",
    ]);
  });

  it("always offers decline", () => {
    for (const n of [0, 1, CONCURRENT_LIMIT, 99]) {
      expect(actionsForChallenge({ activeRealtimeGames: n })).toContain("decline");
    }
  });
});
