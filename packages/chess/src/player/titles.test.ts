import { describe, it, expect } from "vitest";
import {
  MANUAL_TITLES,
  AUTO_TITLES,
  TITLE_LABELS,
  computeAutoTitle,
  resolveTitle,
  isManualTitle,
  isAutoTitle,
  isUnofficialTitle,
} from "./titles";

describe("computeAutoTitle", () => {
  it("returns null below the UM threshold", () => {
    expect(computeAutoTitle(1200)).toBeNull();
    expect(computeAutoTitle(2199)).toBeNull();
  });

  it("awards UM at exactly 2200", () => {
    expect(computeAutoTitle(2200)).toBe("UM");
  });

  it("keeps UM between the thresholds", () => {
    expect(computeAutoTitle(2399)).toBe("UM");
  });

  it("awards AM at exactly 2400", () => {
    expect(computeAutoTitle(2400)).toBe("AM");
  });

  it("prefers the highest earned title", () => {
    expect(computeAutoTitle(3000)).toBe("AM");
  });
});

describe("resolveTitle", () => {
  it("returns null for a user with no titles", () => {
    expect(resolveTitle({ titleManual: null, titleAuto: null, titleBanned: false })).toBeNull();
  });

  it("returns the auto title when no manual title is set", () => {
    expect(resolveTitle({ titleManual: null, titleAuto: "AM", titleBanned: false })).toBe("AM");
  });

  it("returns the manual title when no auto title is set", () => {
    expect(resolveTitle({ titleManual: "IM", titleAuto: null, titleBanned: false })).toBe("IM");
  });

  it("lets a manual title fully mask an auto title", () => {
    expect(resolveTitle({ titleManual: "IM", titleAuto: "AM", titleBanned: false })).toBe("IM");
  });

  it("masks even a lower manual title over a higher auto title", () => {
    // A CM who is also rated 2400+ displays CM, not AM. Manual always wins.
    expect(resolveTitle({ titleManual: "CM", titleAuto: "AM", titleBanned: false })).toBe("CM");
  });

  it("suppresses everything when title-banned", () => {
    expect(resolveTitle({ titleManual: "GM", titleAuto: "AM", titleBanned: true })).toBeNull();
  });

  it("does not destroy state when banned — lifting the ban restores the title", () => {
    const state = { titleManual: "IM" as const, titleAuto: "AM" as const, titleBanned: true };
    expect(resolveTitle(state)).toBeNull();
    expect(resolveTitle({ ...state, titleBanned: false })).toBe("IM");
  });

  it("handles null and undefined input", () => {
    expect(resolveTitle(null)).toBeNull();
    expect(resolveTitle(undefined)).toBeNull();
  });

  it("treats missing fields as absent rather than throwing", () => {
    expect(resolveTitle({})).toBeNull();
  });
});

describe("title guards and metadata", () => {
  it("recognises manual titles", () => {
    expect(isManualTitle("IM")).toBe(true);
    expect(isManualTitle("AM")).toBe(false);
    expect(isManualTitle("nonsense")).toBe(false);
    expect(isManualTitle(null)).toBe(false);
  });

  it("recognises auto titles", () => {
    expect(isAutoTitle("AM")).toBe(true);
    expect(isAutoTitle("UM")).toBe(true);
    expect(isAutoTitle("IM")).toBe(false);
  });

  it("marks only the auto titles as unofficial", () => {
    expect(isUnofficialTitle("AM")).toBe(true);
    expect(isUnofficialTitle("UM")).toBe(true);
    expect(isUnofficialTitle("GM")).toBe(false);
    expect(isUnofficialTitle("NM")).toBe(false);
  });

  it("has a label for every title", () => {
    for (const title of [...MANUAL_TITLES, ...AUTO_TITLES]) {
      expect(TITLE_LABELS[title]).toBeTruthy();
    }
  });

  it("keeps manual and auto title sets disjoint", () => {
    const overlap = (MANUAL_TITLES as readonly string[]).filter((t) =>
      (AUTO_TITLES as readonly string[]).includes(t)
    );
    expect(overlap).toEqual([]);
  });
});
