import { describe, it, expect } from "vitest";
import {
  ENGINES,
  DEFAULT_ENGINE,
  enginesFor,
  availableEngines,
  isEngineValidFor,
  resolveEngine,
} from "./engines";

describe("catalogue", () => {
  it("describes every engine honestly", () => {
    for (const [id, e] of Object.entries(ENGINES)) {
      expect(e.name, id).toBeTruthy();
      expect(e.description.length, id).toBeGreaterThan(30);
      expect(e.sizeMb, id).toBeGreaterThan(0);
      expect(e.licence, id).toBeTruthy();
    }
  });

  it("defaults to something bundled and reasonably sized", () => {
    expect(ENGINES[DEFAULT_ENGINE].available).toBe(true);
    expect(ENGINES[DEFAULT_ENGINE].sizeMb).toBeLessThan(10);
  });
});

describe("purpose filtering", () => {
  it("does not offer Maia for analysis", () => {
    // Maia predicts the likely human move, not the best one. Offering it as an
    // analyst would give people confident, wrong evaluations.
    expect(enginesFor("analyse").map((e) => e.id)).not.toContain("lc0-maia");
    expect(enginesFor("play").map((e) => e.id)).toContain("lc0-maia");
  });

  it("does not offer WorstFish for analysis", () => {
    expect(enginesFor("analyse").map((e) => e.id)).not.toContain("worstfish");
  });

  it("puts engines we actually ship first", () => {
    // An unbundled engine offered above a bundled one means the player picks
    // it, waits, and silently gets something else.
    const list = enginesFor("play");
    const firstUnavailable = list.findIndex((e) => !e.available);
    const lastAvailable = list.map((e) => e.available).lastIndexOf(true);
    if (firstUnavailable !== -1) expect(lastAvailable).toBeLessThan(firstUnavailable);
  });

  it("only offers bundled engines in the picker", () => {
    for (const e of availableEngines("play")) expect(e.available).toBe(true);
    for (const e of availableEngines("analyse")) expect(e.available).toBe(true);
  });

  it("offers something for both purposes", () => {
    expect(enginesFor("play").length).toBeGreaterThan(1);
    expect(enginesFor("analyse").length).toBeGreaterThan(1);
  });
});

describe("resolving a stored choice", () => {
  it("keeps a valid choice", () => {
    expect(resolveEngine("stockfish-18", "analyse")).toBe("stockfish-18");
  });

  it("refuses an engine that is not bundled", () => {
    // Weiss is catalogued but not shipped. Falling back is the honest
    // behaviour; pretending it loaded is not.
    expect(resolveEngine("weiss", "analyse")).toBe(DEFAULT_ENGINE);
  });

  it("falls back when the choice does not fit the purpose", () => {
    // A stored preference can outlive the reason it was valid: someone who
    // picked Maia to play against should not silently get it as an analyst.
    expect(resolveEngine("lc0-maia", "analyse")).toBe(DEFAULT_ENGINE);
    // Also unbundled, so it falls back for play too.
    expect(resolveEngine("lc0-maia", "play")).toBe(DEFAULT_ENGINE);
  });

  it("falls back on an unknown id", () => {
    expect(resolveEngine("houdini", "play")).toBe(DEFAULT_ENGINE);
    expect(resolveEngine(null, "play")).toBe(DEFAULT_ENGINE);
    expect(resolveEngine(undefined, "analyse")).toBe(DEFAULT_ENGINE);
  });

  it("rejects an unknown id outright", () => {
    expect(isEngineValidFor("not-an-engine", "play")).toBe(false);
  });
});
