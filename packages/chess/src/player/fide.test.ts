import { describe, it, expect } from "vitest";
import {
  ARENA_TITLES,
  FIDE_OFFICIAL_TITLES,
  ALL_FIDE_PANEL_TITLES,
  FIDE_PANEL_TITLE_LABELS,
  isFidePanelTitle,
  shouldShowFideProfile,
  isValidFideProfileUrl,
} from "./fide";
import { MANUAL_TITLES, AUTO_TITLES } from "./titles";

describe("FIDE panel titles", () => {
  it("labels every credential", () => {
    for (const t of ALL_FIDE_PANEL_TITLES) expect(FIDE_PANEL_TITLE_LABELS[t]).toBeTruthy();
  });

  it("keeps arena titles out of the username title system", () => {
    // An AGM shown beside a username next to a real GM would misrepresent both.
    const displayed = [...MANUAL_TITLES, ...AUTO_TITLES] as readonly string[];
    for (const t of ARENA_TITLES) expect(displayed).not.toContain(t);
    for (const t of FIDE_OFFICIAL_TITLES) expect(displayed).not.toContain(t);
  });

  it("guards correctly", () => {
    expect(isFidePanelTitle("AGM")).toBe(true);
    expect(isFidePanelTitle("IA")).toBe(true);
    expect(isFidePanelTitle("GM")).toBe(false);
    expect(isFidePanelTitle(null)).toBe(false);
  });
});

describe("shouldShowFideProfile", () => {
  it("hides a disabled panel even when populated", () => {
    expect(shouldShowFideProfile({ enabled: false, standard: 2400 })).toBe(false);
  });

  it("hides an enabled but empty panel", () => {
    // Worse than no panel: it implies the data is missing rather than unentered.
    expect(shouldShowFideProfile({ enabled: true })).toBe(false);
    expect(shouldShowFideProfile({ enabled: true, arenaTitles: [] })).toBe(false);
  });

  it("shows when enabled and any field is populated", () => {
    expect(shouldShowFideProfile({ enabled: true, standard: 2400 })).toBe(true);
    expect(shouldShowFideProfile({ enabled: true, arenaTitles: ["AGM"] })).toBe(true);
    expect(shouldShowFideProfile({ enabled: true, fideId: "1503014" })).toBe(true);
  });

  it("handles null and undefined", () => {
    expect(shouldShowFideProfile(null)).toBe(false);
    expect(shouldShowFideProfile(undefined)).toBe(false);
  });
});

describe("isValidFideProfileUrl", () => {
  it("accepts FIDE's own domains over https", () => {
    expect(isValidFideProfileUrl("https://ratings.fide.com/profile/1503014")).toBe(true);
    expect(isValidFideProfileUrl("https://www.fide.com/news")).toBe(true);
  });

  it("rejects other hosts, including lookalikes", () => {
    expect(isValidFideProfileUrl("https://fide.com.evil.example/x")).toBe(false);
    expect(isValidFideProfileUrl("https://notfide.com/profile")).toBe(false);
  });

  it("rejects plain http and junk", () => {
    expect(isValidFideProfileUrl("http://ratings.fide.com/profile/1")).toBe(false);
    expect(isValidFideProfileUrl("javascript:alert(1)")).toBe(false);
    expect(isValidFideProfileUrl("")).toBe(false);
    expect(isValidFideProfileUrl(null)).toBe(false);
  });
});
