import { describe, it, expect } from "vitest";
import { canCreateAlt, altDenialText, isPerAccount, punishmentApplies, MAX_ALTS } from "./alts";

const base = { altsEnabled: true, title: "GM", isAlt: false, currentAltCount: 0 };

describe("eligibility", () => {
  it("allows a titled player who has been granted it", () => {
    expect(canCreateAlt(base).allowed).toBe(true);
  });

  it("refuses without a staff grant", () => {
    // Self-service alts are ban evasion with extra steps.
    const d = canCreateAlt({ ...base, altsEnabled: false });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("not-enabled");
  });

  it("refuses an untitled account", () => {
    expect(canCreateAlt({ ...base, title: null }).reason).toBe("not-titled");
  });

  it("refuses past the cap", () => {
    expect(canCreateAlt({ ...base, currentAltCount: MAX_ALTS }).reason).toBe("at-limit");
  });

  it("refuses an alt creating its own alts", () => {
    // Otherwise the tree becomes impossible to reason about, and the link back
    // to a single owner - the entire point - is lost.
    expect(canCreateAlt({ ...base, isAlt: true }).reason).toBe("is-an-alt");
  });

  it("checks the alt case before the others", () => {
    const d = canCreateAlt({ altsEnabled: false, title: null, isAlt: true, currentAltCount: 9 });
    expect(d.reason).toBe("is-an-alt");
  });

  it("explains every refusal in actionable words", () => {
    for (const r of ["not-enabled", "not-titled", "at-limit", "is-an-alt"] as const) {
      expect(altDenialText(r).length, r).toBeGreaterThan(20);
    }
  });
});

describe("settings", () => {
  it("keeps identity settings per account", () => {
    // The point of an alt is a different presentation.
    expect(isPerAccount("displayTitle")).toBe(true);
    expect(isPerAccount("bio")).toBe(true);
    expect(isPerAccount("avatarUrl")).toBe(true);
  });

  it("does not make moderation state per account", () => {
    expect(isPerAccount("punishments")).toBe(false);
    expect(isPerAccount("standing")).toBe(false);
  });
});

describe("punishments", () => {
  it("applies across the whole family", () => {
    // Punishing one name while the others keep playing would turn an
    // authorised alt into the evasion tool the authorisation prevents.
    expect(
      punishmentApplies({
        punishedUserId: "owner",
        punishedAltOf: null,
        targetUserId: "alt1",
        targetAltOf: "owner",
      })
    ).toBe(true);
  });

  it("reaches the owner from an alt", () => {
    expect(
      punishmentApplies({
        punishedUserId: "alt1",
        punishedAltOf: "owner",
        targetUserId: "owner",
        targetAltOf: null,
      })
    ).toBe(true);
  });

  it("reaches sibling alts", () => {
    expect(
      punishmentApplies({
        punishedUserId: "alt1",
        punishedAltOf: "owner",
        targetUserId: "alt2",
        targetAltOf: "owner",
      })
    ).toBe(true);
  });

  it("does not reach an unrelated account", () => {
    expect(
      punishmentApplies({
        punishedUserId: "someone",
        punishedAltOf: null,
        targetUserId: "stranger",
        targetAltOf: null,
      })
    ).toBe(false);
  });
});
