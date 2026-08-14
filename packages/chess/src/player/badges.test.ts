import { describe, it, expect } from "vitest";
import {
  BADGES,
  MAX_PINNED_BADGES,
  getBadge,
  isValidBadgeKey,
  grantableBadges,
  badgesByCategory,
  resolveBadges,
  pinnedBadges,
} from "./badges";

describe("badge catalogue", () => {
  it("has unique keys", () => {
    const keys = BADGES.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every badge a label, description, icon and category", () => {
    for (const b of BADGES) {
      expect(b.label).toBeTruthy();
      expect(b.description).toBeTruthy();
      expect(b.icon).toBeTruthy();
      expect(b.category).toBeTruthy();
    }
  });

  it("includes the FIDE arbiter credential", () => {
    const arbiter = getBadge("fide-arbiter");
    expect(arbiter?.label).toBe("FIDE Certified Arbiter");
    expect(arbiter?.grant).toBe("verified");
    expect(arbiter?.requiresEvidence).toBe(true);
  });

  it("requires evidence for every credential badge", () => {
    for (const b of badgesByCategory("credential")) {
      expect(b.requiresEvidence).toBe(true);
    }
  });

  it("looks badges up by key", () => {
    expect(getBadge("founder")?.label).toBe("Founder");
    expect(getBadge("nope")).toBeNull();
    expect(getBadge(null)).toBeNull();
  });

  it("validates keys", () => {
    expect(isValidBadgeKey("fide-arbiter")).toBe(true);
    expect(isValidBadgeKey("invented")).toBe(false);
  });

  it("excludes automatic badges from the staff grant list", () => {
    expect(grantableBadges().every((b) => b.grant !== "automatic")).toBe(true);
    expect(grantableBadges().map((b) => b.key)).toContain("fide-arbiter");
    // Founder is awarded automatically at signup for the first 50 accounts,
    // but staff can still grant and revoke it -- someone who deleted and
    // remade an account should not lose it.
    expect(grantableBadges().map((b) => b.key)).toContain("founder");
    expect(grantableBadges().map((b) => b.key)).not.toContain("marathon");
  });
});

describe("resolveBadges", () => {
  it("returns nothing for a user with no badges", () => {
    expect(resolveBadges([])).toEqual([]);
  });

  it("puts pinned badges first, in the user's chosen order", () => {
    const out = resolveBadges([
      { badgeKey: "marathon" },
      { badgeKey: "founder", pinned: true, pinOrder: 2 },
      { badgeKey: "fide-arbiter", pinned: true, pinOrder: 1 },
    ]);
    expect(out.slice(0, 2).map((b) => b.key)).toEqual(["fide-arbiter", "founder"]);
    expect(out[0].pinned).toBe(true);
    expect(out[2].pinned).toBe(false);
  });

  it("sorts unpinned badges by category, credentials first", () => {
    const out = resolveBadges([
      { badgeKey: "founder" },
      { badgeKey: "marathon" },
      { badgeKey: "fide-arbiter" },
    ]);
    expect(out.map((b) => b.key)).toEqual(["fide-arbiter", "marathon", "founder"]);
  });

  it("drops unknown keys rather than rendering a blank", () => {
    // A badge retired from the catalogue should vanish from profiles, not
    // leave a hole behind.
    const out = resolveBadges([{ badgeKey: "founder" }, { badgeKey: "retired-badge" }]);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe("founder");
  });

  it("demotes pins beyond the cap instead of rejecting them", () => {
    // Lowering MAX_PINNED_BADGES later must not leave anyone in a broken state.
    const held = ["founder", "marathon", "centurion", "giant-slayer", "patron"].map(
      (badgeKey, i) => ({ badgeKey, pinned: true, pinOrder: i })
    );
    const out = resolveBadges(held);
    expect(out.filter((b) => b.pinned)).toHaveLength(MAX_PINNED_BADGES);
    expect(out).toHaveLength(5);
  });

  it("treats a missing pinOrder as first rather than throwing", () => {
    const out = resolveBadges([
      { badgeKey: "founder", pinned: true },
      { badgeKey: "marathon", pinned: true, pinOrder: 5 },
    ]);
    expect(out[0].key).toBe("founder");
  });

  it("carries grantedAt through", () => {
    const when = new Date("2026-01-01");
    expect(resolveBadges([{ badgeKey: "founder", grantedAt: when }])[0].grantedAt).toBe(when);
  });
});

describe("pinnedBadges", () => {
  it("returns only the pinned ones", () => {
    const out = pinnedBadges([
      { badgeKey: "founder", pinned: true, pinOrder: 0 },
      { badgeKey: "marathon" },
    ]);
    expect(out.map((b) => b.key)).toEqual(["founder"]);
  });

  it("is empty when nothing is pinned", () => {
    expect(pinnedBadges([{ badgeKey: "founder" }])).toEqual([]);
  });
});
