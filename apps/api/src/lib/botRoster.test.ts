import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { parse } from "yaml";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface RosterBot {
  name: string;
  elo: number;
  preferredOpenings?: { asWhite?: string[]; asBlack?: string[] };
  messages?: Record<string, string[]>;
}

/**
 * The bot roster is data, and data goes wrong silently.
 *
 * A typo in an opening line does not crash anything — it just means the bot
 * never uses its book and reverts to whatever the engine feels like, which is
 * exactly how 2600-rated bots ended up playing the Scandinavian.
 */
describe("bot roster", () => {
  const file = resolve(process.cwd(), "../../deployment/config/bots.yml");
  const bots = (parse(readFileSync(file, "utf8")).bots ?? []) as RosterBot[];

  it("loads the roster", () => {
    expect(bots.length).toBeGreaterThan(10);
  });

  it("gives every bot a repertoire", () => {
    for (const b of bots) {
      if (b.name === "WorstFish" || b.name === "DrawFish") continue; // novelty bots have none
      expect(b.preferredOpenings?.asWhite?.length, b.name).toBeGreaterThan(0);
      expect(b.preferredOpenings?.asBlack?.length, b.name).toBeGreaterThan(0);
    }
  });

  it("contains only legal move sequences", () => {
    for (const b of bots) {
      for (const side of ["asWhite", "asBlack"] as const) {
        for (const line of b.preferredOpenings?.[side] ?? []) {
          const chess = new Chess();
          for (const san of line.trim().split(/\s+/)) {
            expect(
              chess.moves().includes(san),
              `${b.name} ${side}: "${line}" — ${san} is not legal there`
            ).toBe(true);
            chess.move(san);
          }
        }
      }
    }
  });

  it("starts black repertoires from principled replies", () => {
    // The reported bug: strong bots answering 1.e4 with the Scandinavian.
    const strong = bots.filter((b) => b.elo >= 2000 && !["WorstFish", "DrawFish"].includes(b.name));
    expect(strong.length).toBeGreaterThan(0);
    for (const b of strong) {
      for (const line of b.preferredOpenings!.asBlack!) {
        // Index 1, not 0: lines are complete sequences from the start, so
        // White's move is first and Black's reply is second.
        const reply = line.trim().split(/\s+/)[1];
        expect(["c5", "e5", "Nf6", "e6", "c6", "g6", "d6"], `${b.name}: ${line}`).toContain(reply);
      }
    }
  });

  it("gives every bot enough dialogue not to repeat itself", () => {
    const EVENTS = [
      "gameStart",
      "onCapture",
      "onBeingChecked",
      "onGivingCheck",
      "onBlunder",
      "onPlayerBlunder",
      "onWinning",
      "onLosing",
      "onCheckmate",
      "onCheckmated",
      "onDraw",
    ];
    for (const b of bots) {
      for (const e of EVENTS) {
        // Two lines per event meant a bot repeated itself inside one game.
        expect(b.messages?.[e]?.length ?? 0, `${b.name}.${e}`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("includes the novelty bots", () => {
    expect(bots.some((b) => b.name === "WorstFish")).toBe(true);
    expect(bots.some((b) => b.name === "DrawFish")).toBe(true);
  });
});
