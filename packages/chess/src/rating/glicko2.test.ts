import { describe, it, expect } from "vitest";
import {
  updateRating,
  updateFromGame,
  defaultRating,
  isEstablished,
  conservativeRating,
  DEFAULT_RATING,
  type Rating,
} from "./glicko2";

/**
 * The worked example from Glickman's own paper (glicko.net/glicko/glicko2.pdf).
 * A player at 1500/200 plays three opponents and should land near 1464.06 with
 * a deviation near 151.52. This is the check that the implementation is
 * actually Glicko-2 and not a plausible-looking approximation.
 */
describe("Glickman's worked example", () => {
  const player: Rating = { rating: 1500, deviation: 200, volatility: 0.06 };
  const results = [
    { opponent: { rating: 1400, deviation: 30, volatility: 0.06 }, score: 1 },
    { opponent: { rating: 1550, deviation: 100, volatility: 0.06 }, score: 0 },
    { opponent: { rating: 1700, deviation: 300, volatility: 0.06 }, score: 0 },
  ];

  const out = updateRating(player, results);

  it("produces the published rating", () => {
    expect(out.rating).toBeGreaterThan(1461);
    expect(out.rating).toBeLessThan(1467);
  });

  it("produces the published deviation", () => {
    expect(out.deviation).toBeGreaterThan(149);
    expect(out.deviation).toBeLessThan(154);
  });

  it("barely moves volatility", () => {
    expect(out.volatility).toBeGreaterThan(0.059);
    expect(out.volatility).toBeLessThan(0.06);
  });
});

describe("uncertainty behaves", () => {
  it("moves a new player far more than a settled one", () => {
    const newbie: Rating = { rating: 1500, deviation: 350, volatility: 0.06 };
    const veteran: Rating = { rating: 1500, deviation: 40, volatility: 0.06 };
    const opp: Rating = { rating: 1500, deviation: 40, volatility: 0.06 };

    const newbieGain = updateFromGame(newbie, opp, 1).rating - 1500;
    const veteranGain = updateFromGame(veteran, opp, 1).rating - 1500;

    // The whole reason for moving off Elo: a newcomer's rating should find its
    // level quickly instead of crawling.
    expect(newbieGain).toBeGreaterThan(veteranGain * 3);
  });

  it("shrinks deviation as games are played", () => {
    let r = defaultRating();
    const opp: Rating = { rating: 1500, deviation: 50, volatility: 0.06 };
    const before = r.deviation;
    for (let i = 0; i < 10; i++) r = updateFromGame(r, opp, i % 2 === 0 ? 1 : 0);
    expect(r.deviation).toBeLessThan(before);
  });

  it("grows deviation during inactivity without moving the rating", () => {
    const settled: Rating = { rating: 1800, deviation: 50, volatility: 0.06 };
    const after = updateRating(settled, []);
    expect(after.rating).toBe(1800);
    expect(after.deviation).toBeGreaterThan(50);
  });

  it("never lets deviation exceed the starting uncertainty", () => {
    let r: Rating = { rating: 1500, deviation: 340, volatility: 0.2 };
    for (let i = 0; i < 50; i++) r = updateRating(r, []);
    expect(r.deviation).toBeLessThanOrEqual(350);
  });
});

describe("direction and symmetry", () => {
  it("gains for a win and loses for a loss", () => {
    const p = defaultRating();
    const opp: Rating = { rating: 1500, deviation: 50, volatility: 0.06 };
    expect(updateFromGame(p, opp, 1).rating).toBeGreaterThan(DEFAULT_RATING);
    expect(updateFromGame(p, opp, 0).rating).toBeLessThan(DEFAULT_RATING);
  });

  it("barely moves for a draw between equals", () => {
    const p: Rating = { rating: 1500, deviation: 60, volatility: 0.06 };
    const out = updateFromGame(p, { ...p }, 0.5);
    expect(Math.abs(out.rating - 1500)).toBeLessThanOrEqual(1);
  });

  it("rewards beating a stronger opponent more", () => {
    const p: Rating = { rating: 1500, deviation: 80, volatility: 0.06 };
    const weak: Rating = { rating: 1200, deviation: 50, volatility: 0.06 };
    const strong: Rating = { rating: 1900, deviation: 50, volatility: 0.06 };
    expect(updateFromGame(p, strong, 1).rating).toBeGreaterThan(updateFromGame(p, weak, 1).rating);
  });
});

describe("established and conservative ratings", () => {
  it("treats a fresh account as unestablished", () => {
    expect(isEstablished(defaultRating())).toBe(false);
  });

  it("treats a settled rating as established", () => {
    expect(isEstablished({ rating: 1800, deviation: 60, volatility: 0.06 })).toBe(true);
  });

  it("ranks an uncertain high rating below a settled one", () => {
    // A 2400 with deviation 300 has played three games, not demonstrated 2400.
    const lucky = { rating: 2400, deviation: 300, volatility: 0.06 };
    const proven = { rating: 2000, deviation: 40, volatility: 0.06 };
    expect(conservativeRating(lucky)).toBeLessThan(conservativeRating(proven));
  });
});
