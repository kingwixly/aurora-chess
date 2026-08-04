import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing settings
vi.mock("./prisma.js", () => ({
  prisma: {
    siteSettings: {
      findUnique: vi.fn(),
    },
  },
}));

import { getSiteSettings } from "./settings.js";
import { prisma } from "./prisma.js";

const mockFindUnique = vi.mocked(prisma.siteSettings.findUnique);

describe("getSiteSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear relevant env vars
    delete process.env.SITE_NAME;
    delete process.env.REGISTRATION_OPEN;
    delete process.env.MAX_USERS;
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
  });

  it("should return settings from the database when found", async () => {
    mockFindUnique.mockResolvedValue({
      id: "singleton",
      siteName: "MyChess",
      registrationOpen: false,
      maxUsers: 100,
      requireEmailVerification: true,
      updatedAt: new Date(),
    });

    const settings = await getSiteSettings();

    expect(settings).toEqual({
      siteName: "MyChess",
      registrationOpen: false,
      maxUsers: 100,
      requireEmailVerification: true,
    });
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "singleton" } });
  });

  it("should fall back to env vars when no DB record exists", async () => {
    mockFindUnique.mockResolvedValue(null);

    process.env.SITE_NAME = "EnvChess";
    process.env.REGISTRATION_OPEN = "false";
    process.env.MAX_USERS = "50";
    process.env.REQUIRE_EMAIL_VERIFICATION = "true";

    const settings = await getSiteSettings();

    expect(settings).toEqual({
      siteName: "EnvChess",
      registrationOpen: false,
      maxUsers: 50,
      requireEmailVerification: true,
    });
  });

  it("should use defaults when no DB record and no env vars", async () => {
    mockFindUnique.mockResolvedValue(null);

    const settings = await getSiteSettings();

    expect(settings).toEqual({
      siteName: "EyeOnChess",
      registrationOpen: true,
      maxUsers: 0,
      requireEmailVerification: false,
    });
  });

  it("should treat REGISTRATION_OPEN as true unless explicitly 'false'", async () => {
    mockFindUnique.mockResolvedValue(null);

    process.env.REGISTRATION_OPEN = "true";
    let settings = await getSiteSettings();
    expect(settings.registrationOpen).toBe(true);

    process.env.REGISTRATION_OPEN = "yes";
    settings = await getSiteSettings();
    expect(settings.registrationOpen).toBe(true);

    process.env.REGISTRATION_OPEN = "false";
    settings = await getSiteSettings();
    expect(settings.registrationOpen).toBe(false);
  });
});
