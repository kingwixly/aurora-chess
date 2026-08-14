import { describe, it, expect } from "vitest";
import {
  isActive,
  capabilitiesFor,
  countingStrikes,
  blocksAutomaticTitles,
  titleBlockExpiresAt,
  canAppeal,
  STRIKE_WINDOW_MONTHS,
  type PunishmentRecord,
} from "./punishments";

const NOW = new Date("2026-06-01T00:00:00Z");
const ago = (months: number) => {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - months);
  return d;
};

function p(over: Partial<PunishmentRecord> = {}): PunishmentRecord {
  return {
    id: "p1",
    type: "WARNING",
    reason: "test",
    createdAt: ago(1),
    ...over,
  };
}

describe("isActive", () => {
  it("treats a permanent unlifted punishment as active", () => {
    expect(isActive(p({ type: "BAN", expiresAt: null }), NOW)).toBe(true);
  });
  it("treats an expired punishment as inactive", () => {
    expect(isActive(p({ expiresAt: ago(1) }), NOW)).toBe(false);
  });
  it("treats a lifted punishment as inactive even if unexpired", () => {
    expect(isActive(p({ expiresAt: null, liftedAt: ago(0) }), NOW)).toBe(false);
  });
  it("treats an overturned punishment as inactive", () => {
    expect(isActive(p({ expiresAt: null, overturnedAt: ago(0) }), NOW)).toBe(false);
  });
});

describe("capabilities", () => {
  it("leaves everything alone for a warning", () => {
    const c = capabilitiesFor([p({ type: "WARNING", expiresAt: null })], NOW);
    expect(c.playPublic).toBe(true);
    expect(c.chat).toBe(true);
  });

  it("restriction blocks public play but not friends or bots", () => {
    const c = capabilitiesFor([p({ type: "RESTRICTION", expiresAt: null })], NOW);
    expect(c.playPublic).toBe(false);
    expect(c.playFriends).toBe(true);
    expect(c.playBots).toBe(true);
  });

  it("suspension blocks all human play but leaves bots", () => {
    const c = capabilitiesFor([p({ type: "SUSPENSION", expiresAt: null })], NOW);
    expect(c.playPublic).toBe(false);
    expect(c.playFriends).toBe(false);
    // Deliberate: a suspension is about the offence, not about withholding chess.
    expect(c.playBots).toBe(true);
    expect(c.puzzles).toBe(true);
  });

  it("deactivation leaves browsing only", () => {
    const c = capabilitiesFor([p({ type: "DEACTIVATION", expiresAt: null })], NOW);
    expect(c.playBots).toBe(false);
    expect(c.puzzles).toBe(false);
    expect(c.chat).toBe(false);
    expect(c.browse).toBe(true);
  });

  it("a ban removes browsing but never standing", () => {
    const c = capabilitiesFor([p({ type: "BAN", expiresAt: null })], NOW);
    expect(c.browse).toBe(false);
    // The whole appeal system depends on this staying true.
    expect(c.standing).toBe(true);
  });

  it("combines to the most restrictive, not the most recent", () => {
    // A warning issued after a suspension must not quietly unsuspend anyone.
    const c = capabilitiesFor(
      [
        p({ id: "a", type: "SUSPENSION", expiresAt: null, createdAt: ago(2) }),
        p({ id: "b", type: "WARNING", expiresAt: null, createdAt: ago(0) }),
      ],
      NOW
    );
    expect(c.playFriends).toBe(false);
  });

  it("ignores expired punishments", () => {
    const c = capabilitiesFor([p({ type: "SUSPENSION", expiresAt: ago(1) })], NOW);
    expect(c.playPublic).toBe(true);
  });
});

describe("strikes", () => {
  it("counts a recently expired punishment", () => {
    expect(countingStrikes([p({ expiresAt: ago(2), becameStrikeAt: ago(2) })], NOW)).toHaveLength(
      1
    );
  });

  it("stops counting after the window", () => {
    const old = ago(STRIKE_WINDOW_MONTHS + 1);
    expect(countingStrikes([p({ expiresAt: old, becameStrikeAt: old })], NOW)).toHaveLength(0);
  });

  it("never counts an overturned punishment", () => {
    // A successful appeal means it should not have happened, so it must not
    // keep having effects.
    expect(
      countingStrikes([p({ expiresAt: ago(1), becameStrikeAt: ago(1), overturnedAt: ago(0) })], NOW)
    ).toHaveLength(0);
  });

  it("never counts a ban as a strike", () => {
    expect(countingStrikes([p({ type: "BAN", expiresAt: null })], NOW)).toHaveLength(0);
  });

  it("counts an active punishment", () => {
    expect(countingStrikes([p({ type: "SUSPENSION", expiresAt: null })], NOW)).toHaveLength(1);
  });
});

describe("automatic title block", () => {
  it("blocks while a strike counts", () => {
    expect(blocksAutomaticTitles([p({ expiresAt: ago(3), becameStrikeAt: ago(3) })], NOW)).toBe(
      true
    );
  });

  it("lifts once the window passes", () => {
    const old = ago(STRIKE_WINDOW_MONTHS + 1);
    expect(blocksAutomaticTitles([p({ expiresAt: old, becameStrikeAt: old })], NOW)).toBe(false);
  });

  it("lifts immediately when overturned", () => {
    expect(
      blocksAutomaticTitles(
        [p({ expiresAt: ago(1), becameStrikeAt: ago(1), overturnedAt: ago(0) })],
        NOW
      )
    ).toBe(false);
  });

  it("reports when the block ends", () => {
    const end = titleBlockExpiresAt([p({ expiresAt: ago(3), becameStrikeAt: ago(3) })], NOW);
    expect(end).not.toBeNull();
    // Twelve months after the strike, which was three months ago.
    expect(end!.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("reports no end date for an active permanent punishment", () => {
    expect(titleBlockExpiresAt([p({ type: "SUSPENSION", expiresAt: null })], NOW)).toBeNull();
  });
});

describe("appeal eligibility", () => {
  it("allows appealing an expired warning", () => {
    // The whole point: an old warning still blocks titles, so contesting it is
    // a real stake rather than a formality.
    expect(canAppeal(p({ expiresAt: ago(2), becameStrikeAt: ago(2) })).allowed).toBe(true);
  });

  it("refuses a ban shorter than three days", () => {
    const created = new Date("2026-05-01T00:00:00Z");
    const r = canAppeal(
      p({ type: "BAN", createdAt: created, expiresAt: new Date("2026-05-02T00:00:00Z") })
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("too-short");
  });

  it("allows a ban of three days or more", () => {
    const created = new Date("2026-05-01T00:00:00Z");
    expect(
      canAppeal(p({ type: "BAN", createdAt: created, expiresAt: new Date("2026-05-05T00:00:00Z") }))
        .allowed
    ).toBe(true);
  });

  it("allows a permanent ban by default", () => {
    expect(canAppeal(p({ type: "BAN", expiresAt: null })).allowed).toBe(true);
  });

  it("refuses when a moderator has disabled appeals", () => {
    expect(canAppeal(p({ appealsDisabled: true })).reason).toBe("appeals-disabled");
  });

  it("refuses a second open appeal", () => {
    expect(canAppeal(p(), { openAppealExists: true }).reason).toBe("already-open");
  });

  it("refuses after three consecutive denials", () => {
    expect(canAppeal(p(), { consecutiveDenials: 3 }).reason).toBe("three-denials");
  });

  it("refuses an appeal-banned account", () => {
    expect(canAppeal(p(), { appealBanned: true }).reason).toBe("appeal-banned");
  });
});
