import { describe, it, expect } from "vitest";
import {
  MANUAL_TITLES,
  AUTO_TITLES,
  FIDE_TITLES,
  MANUAL_UNOFFICIAL_TITLES,
  TITLE_LABELS,
  TITLE_CRITERIA_TEXT,
  computeAutoTitle,
  computeEarnedAutoTitles,
  resolveTitle,
  isManualTitle,
  isAutoTitle,
  isFideTitle,
  isNationalTitle,
  isOfficialTitle,
  isUnofficialTitle,
  NATIONAL_TITLES,
} from "./titles";

describe("computeAutoTitle - overall strength", () => {
  it("returns null for a new account", () => {
    expect(computeAutoTitle({})).toBeNull();
    expect(computeAutoTitle({ peakOverall: 2499 })).toBeNull();
  });
  it("awards AM at 2500 overall", () => {
    expect(computeAutoTitle({ peakOverall: 2500 })).toBe("AM");
  });
  it("awards UM at 2700 overall", () => {
    expect(computeAutoTitle({ peakOverall: 2700 })).toBe("UM");
  });
  it("ranks UM above AM", () => {
    expect(computeAutoTitle({ peakOverall: 3000 })).toBe("UM");
  });
});

describe("computeAutoTitle - format specialists", () => {
  it("awards BM from bullet alone", () => {
    expect(computeAutoTitle({ peakBullet: 2500 })).toBe("BM");
  });
  it("awards BM from blitz alone", () => {
    expect(computeAutoTitle({ peakBlitz: 2550 })).toBe("BM");
  });
  it("does not award BM from classical strength", () => {
    expect(computeAutoTitle({ peakClassical: 2700, peakBullet: 1500 })).toBe("TdM");
  });
  it("awards HrM for classical", () => {
    expect(computeAutoTitle({ peakClassical: 2500 })).toBe("TdM");
  });
  it("prefers overall strength over a specialist title", () => {
    expect(computeAutoTitle({ peakOverall: 2700, peakBullet: 2500 })).toBe("UM");
  });
});

describe("computeAutoTitle - PM percentile", () => {
  it("withholds PM when no cutoff has been computed yet", () => {
    // A new site has too small a population for a percentile to mean anything;
    // a zero cutoff must disable the title, not grant it to everyone.
    expect(
      computeAutoTitle({ puzzlePeak: 2600, puzzlesSolved: 500, puzzlePercentileCutoff: 0 })
    ).toBeNull();
  });
  it("withholds PM below the sample floor", () => {
    expect(
      computeAutoTitle({ puzzlePeak: 2600, puzzlesSolved: 199, puzzlePercentileCutoff: 2600 })
    ).toBeNull();
  });
  it("withholds PM below the cutoff", () => {
    expect(
      computeAutoTitle({ puzzlePeak: 2599, puzzlesSolved: 500, puzzlePercentileCutoff: 2600 })
    ).toBeNull();
  });
  it("awards PM at the cutoff with enough solved", () => {
    expect(
      computeAutoTitle({ puzzlePeak: 2600, puzzlesSolved: 200, puzzlePercentileCutoff: 2600 })
    ).toBe("PM");
  });
});

describe("computeAutoTitle - EM and TM", () => {
  it("withholds EM below the game floor even at a perfect rate", () => {
    expect(computeAutoTitle({ endgameWins: 49, endgameGames: 49 })).toBeNull();
  });
  it("withholds EM when the win rate falls short", () => {
    expect(computeAutoTitle({ endgameWins: 32, endgameGames: 50 })).toBeNull();
  });
  it("awards EM at exactly the threshold", () => {
    expect(computeAutoTitle({ endgameWins: 65, endgameGames: 100 })).toBe("EM");
  });
  it("never divides by zero", () => {
    expect(computeAutoTitle({ endgameWins: 0, endgameGames: 0 })).toBeNull();
  });
  it("awards TM at three tournament wins", () => {
    expect(computeAutoTitle({ tournamentWins: 2 })).toBeNull();
    expect(computeAutoTitle({ tournamentWins: 3 })).toBe("TM");
  });
});

describe("computeEarnedAutoTitles", () => {
  it("lists every qualifying title in precedence order", () => {
    expect(
      computeEarnedAutoTitles({
        peakOverall: 2700,
        peakBullet: 2600,
        peakClassical: 2550,
        tournamentWins: 5,
      })
    ).toEqual(["UM", "AM", "BM", "TdM", "TM"]);
  });
  it("is empty for a new account", () => {
    expect(computeEarnedAutoTitles({})).toEqual([]);
  });
  it("agrees with computeAutoTitle on the top title", () => {
    const c = { peakOverall: 2550, peakBullet: 2700 };
    expect(computeEarnedAutoTitles(c)[0]).toBe(computeAutoTitle(c));
  });
});

describe("resolveTitle", () => {
  it("returns null when nothing is set", () => {
    expect(resolveTitle({})).toBeNull();
    expect(resolveTitle(null)).toBeNull();
    expect(resolveTitle(undefined)).toBeNull();
  });
  it("shows the automatic title when no manual title exists", () => {
    expect(resolveTitle({ titleAuto: "UM" })).toBe("UM");
  });
  it("lets a manual title fully mask an automatic one", () => {
    expect(resolveTitle({ titleManual: "IM", titleAuto: "UM" })).toBe("IM");
  });
  it("masks even a lower manual title over a higher automatic one", () => {
    expect(resolveTitle({ titleManual: "WCM", titleAuto: "UM" })).toBe("WCM");
  });
  it("suppresses everything when title-banned", () => {
    expect(resolveTitle({ titleManual: "GM", titleAuto: "UM", titleBanned: true })).toBeNull();
  });
  it("restores the underlying title when a ban is lifted", () => {
    const s = { titleManual: "IM" as const, titleAuto: "UM" as const, titleBanned: true };
    expect(resolveTitle(s)).toBeNull();
    expect(resolveTitle({ ...s, titleBanned: false })).toBe("IM");
  });
});

describe("title metadata", () => {
  it("has a label and criteria line for every title", () => {
    for (const t of [...MANUAL_TITLES, ...AUTO_TITLES]) {
      expect(TITLE_LABELS[t]).toBeTruthy();
      expect(TITLE_CRITERIA_TEXT[t]).toBeTruthy();
    }
  });
  it("has no duplicate abbreviations", () => {
    const all = [...MANUAL_TITLES, ...AUTO_TITLES];
    expect(new Set(all).size).toBe(all.length);
  });
  it("keeps manual and automatic sets disjoint", () => {
    expect(
      (MANUAL_TITLES as readonly string[]).filter((t) =>
        (AUTO_TITLES as readonly string[]).includes(t)
      )
    ).toEqual([]);
  });
  it("treats FIDE titles as official and Aurora titles as not", () => {
    for (const t of [...FIDE_TITLES, ...NATIONAL_TITLES]) expect(isUnofficialTitle(t)).toBe(false);
    for (const t of [...AUTO_TITLES, ...MANUAL_UNOFFICIAL_TITLES]) {
      expect(isUnofficialTitle(t)).toBe(true);
    }
  });
  it("treats national titles as official but not FIDE", () => {
    expect(isFideTitle("NM")).toBe(false);
    expect(isNationalTitle("NM")).toBe(true);
    expect(isOfficialTitle("NM")).toBe(true);
    expect(isOfficialTitle("GM")).toBe(true);
    expect(isOfficialTitle("HM")).toBe(false);
    expect(isManualTitle("NM")).toBe(true);
    expect(isUnofficialTitle("NM")).toBe(false);
  });
  it("guards correctly", () => {
    expect(isManualTitle("IM")).toBe(true);
    expect(isManualTitle("HM")).toBe(true);
    expect(isManualTitle("UM")).toBe(false);
    expect(isAutoTitle("TdM")).toBe(true);
    expect(isAutoTitle("HM")).toBe(false);
    expect(isFideTitle("GM")).toBe(true);
    expect(isManualTitle(null)).toBe(false);
  });
});
