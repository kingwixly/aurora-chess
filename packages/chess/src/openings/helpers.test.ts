import { describe, it, expect } from "vitest";
import { lookupOpening } from "./helpers";

describe("lookupOpening", () => {
  it("returns Ruy Lopez for e4 e5 Nf3 Nc6 Bb5", () => {
    const result = lookupOpening(["e4", "e5", "Nf3", "Nc6", "Bb5"]);
    expect(result).toEqual({ name: "Ruy Lopez", eco: "C60" });
  });

  it("returns Sicilian Defense for e4 c5", () => {
    const result = lookupOpening(["e4", "c5"]);
    expect(result).toEqual({ name: "Sicilian Defense", eco: "B20" });
  });

  it("returns Queen's Gambit for d4 d5 c4", () => {
    const result = lookupOpening(["d4", "d5", "c4"]);
    expect(result).toEqual({ name: "Queen's Gambit", eco: "D06" });
  });

  it("returns English Opening for c4", () => {
    const result = lookupOpening(["c4"]);
    expect(result).toEqual({ name: "English Opening", eco: "A10" });
  });

  it("returns null for empty moves", () => {
    const result = lookupOpening([]);
    expect(result).toBeNull();
  });

  it("returns null for unrecognized opening moves", () => {
    const result = lookupOpening(["a3"]);
    expect(result).toBeNull();
  });

  it("uses longest prefix match: e4 e5 Nf3 Nc6 Bb5 a6 returns Morphy Defense", () => {
    const result = lookupOpening(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"]);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Ruy Lopez: Morphy Defense");
    expect(result!.eco).toBe("C65");
  });

  it("returns Sicilian Najdorf for the full Najdorf move sequence", () => {
    const result = lookupOpening([
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
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Sicilian Najdorf");
    expect(result!.eco).toBe("B90");
  });

  it("returns longest match when extra moves follow a known opening", () => {
    // e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O matches Ruy Lopez: Closed (longer than Morphy Defense)
    const result = lookupOpening(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O"]);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Ruy Lopez: Closed");
    expect(result!.eco).toBe("C84");
  });

  it("returns Italian Game for e4 e5 Nf3 Nc6 Bc4", () => {
    const result = lookupOpening(["e4", "e5", "Nf3", "Nc6", "Bc4"]);
    expect(result).toEqual({ name: "Italian Game", eco: "C50" });
  });

  it("returns French Defense for e4 e6", () => {
    const result = lookupOpening(["e4", "e6"]);
    expect(result).toEqual({ name: "French Defense", eco: "C00" });
  });

  it("returns Caro-Kann Defense for e4 c6", () => {
    const result = lookupOpening(["e4", "c6"]);
    expect(result).toEqual({ name: "Caro-Kann Defense", eco: "B10" });
  });

  it("matches longer prefix over shorter: e4 c5 Nf3 Nc6 returns Old Sicilian", () => {
    const result = lookupOpening(["e4", "c5", "Nf3", "Nc6"]);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Sicilian Defense: Old Sicilian");
    expect(result!.eco).toBe("B30");
  });
});
