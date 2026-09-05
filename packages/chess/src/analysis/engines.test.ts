import { describe, it, expect } from "vitest";
import {
  ENGINES,
  DEFAULT_ENGINE,
  enginesFor,
  availableEngines,
  engineForVariant,
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

describe("worker paths", () => {
  it("every available engine names a worker file", () => {
    // A wrong path does not throw - the worker simply never loads and the
    // board sits at "Loading engine" forever.
    for (const e of availableEngines("play")) {
      // A query string is allowed: the adapter uses one to choose its build.
      expect(e.worker, e.id).toMatch(/^\/(engines|stockfish)\/.+\.js(\?.+)?$/);
    }
  });
});

describe("resolving a stored choice", () => {
  it("keeps a valid choice", () => {
    expect(resolveEngine("stockfish-classic", "analyse")).toBe("stockfish-classic");
  });

  it("falls back on a choice that is no longer catalogued", () => {
    // Stored preferences outlive the catalogue. Someone who picked Weiss
    // before it was removed should quietly get the default rather than a
    // worker path that 404s.
    expect(resolveEngine("weiss", "analyse")).toBe(DEFAULT_ENGINE);
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

describe("worker construction", () => {
  it("marks ES-module builds as such", () => {
    // Loading a module build without `{ type: "module" }` fails silently: the
    // Worker constructs, the import throws inside it, and no message ever
    // arrives. The board then waits forever for a ready that never comes.
    expect(ENGINES["fairy-sf14"].workerType).toBe("module");
  });

  it("leaves classic builds classic", () => {
    // Passing type: module to a plain script is equally fatal, in the other
    // direction.
    expect(ENGINES["stockfish-18-lite"].workerType ?? "classic").toBe("classic");
    expect(ENGINES["stockfish-classic"].workerType ?? "classic").toBe("classic");
  });

  it("routes module builds through the adapter", () => {
    for (const e of Object.values(ENGINES)) {
      if (e.workerType !== "module") continue;
      expect(e.worker, e.id).toContain("lila-adapter.js?engine=");
    }
  });
});

describe("variants", () => {
  it("has exactly one engine that plays variants", () => {
    // Worth asserting: if a second one ever claims variant support, the code
    // that picks an engine for a variant game needs to choose between them
    // rather than taking the first match.
    const withVariants = Object.values(ENGINES).filter((e) => e.variants && e.variants.length > 0);
    expect(withVariants).toHaveLength(1);
    expect(withVariants[0].id).toBe("fairy-sf14");
  });

  it("includes chess960, which the site already supports", () => {
    expect(ENGINES["fairy-sf14"].variants).toContain("chess960");
  });
});

describe("what the picker offers", () => {
  it("never offers Fairy-Stockfish", () => {
    // It shipped in the picker once because the explaining comment landed and
    // the `selectable: false` field did not. A comment cannot fail a test;
    // this can.
    for (const purpose of ["play", "analyse"] as const) {
      const ids = availableEngines(purpose).map((e) => e.id);
      expect(ids, purpose).not.toContain("fairy-sf14");
    }
  });

  it("offers every engine that is not special-purpose", () => {
    // The other side of the same coin: filtering must not be so eager that it
    // hides engines people are meant to choose.
    const ids = availableEngines("play").map((e) => e.id);
    expect(ids).toContain("stockfish-18-lite");
    expect(ids.length).toBeGreaterThan(1);
  });

  it("still resolves Fairy for variant games", () => {
    // Hidden from the picker, but reachable by the code that needs it.
    expect(engineForVariant("ATOMIC", "stockfish-18-lite")).toBe("fairy-sf14");
    expect(engineForVariant("STANDARD", "stockfish-18-lite")).toBe("stockfish-18-lite");
    // Chess960 is a shuffled start, not a rule change.
    expect(engineForVariant("CHESS960", "stockfish-18-lite")).toBe("stockfish-18-lite");
  });
});
