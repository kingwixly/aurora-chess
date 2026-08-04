import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs before importing the module
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(),
    watch: vi.fn(),
  },
}));

// Mock the logger to avoid side effects
vi.mock("./logger.js", () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { getRouteLimit, initRateLimitConfig, getRateLimitConfig } from "./rateLimit.js";

describe("rateLimit", () => {
  beforeEach(() => {
    // Initialize with defaults (no config file found since fs.existsSync returns false)
    initRateLimitConfig();
  });

  describe("initRateLimitConfig / getRateLimitConfig", () => {
    it("returns default config when no config file exists", () => {
      const config = getRateLimitConfig();
      expect(config.global).toEqual({ max: 100, timeWindow: "1 minute" });
      expect(config.routes).toEqual({});
    });
  });

  describe("getRouteLimit", () => {
    it("returns global limit when no route matches", () => {
      const limit = getRouteLimit("/api/some-unknown-route");
      expect(limit.max).toBe(100);
      expect(limit.timeWindow).toBe("1 minute");
    });

    it("returns global limit for any URL when routes are empty", () => {
      const limit = getRouteLimit("/api/games");
      expect(limit).toEqual({ max: 100, timeWindow: "1 minute" });
    });
  });

  describe("getRouteLimit with custom config", () => {
    beforeEach(async () => {
      // Dynamically set up a config with routes by importing fs and making it return a YAML
      const fs = await import("fs");
      const fsMock = vi.mocked(fs.default);

      // Make one specific path exist
      fsMock.existsSync.mockImplementation((p: unknown) => {
        return (
          String(p).includes("rate-limits.yml") && String(p).includes("config/rate-limits.yml")
        );
      });

      fsMock.readFileSync.mockReturnValue(`
global:
  max: 50
  timeWindow: "30 seconds"
routes:
  /api/auth/login:
    max: 5
    timeWindow: "1 minute"
  /api/games/*:
    max: 200
    timeWindow: "1 minute"
`);

      initRateLimitConfig();
    });

    it("returns exact match for configured route", () => {
      const limit = getRouteLimit("/api/auth/login");
      expect(limit.max).toBe(5);
      expect(limit.timeWindow).toBe("1 minute");
    });

    it("returns wildcard match for pattern route", () => {
      const limit = getRouteLimit("/api/games/abc123");
      expect(limit.max).toBe(200);
    });

    it("returns global for non-matching route", () => {
      const limit = getRouteLimit("/api/users/profile");
      expect(limit.max).toBe(50);
      expect(limit.timeWindow).toBe("30 seconds");
    });

    it("prefers exact match over wildcard", () => {
      // /api/auth/login is exact, should not fall through to wildcard
      const limit = getRouteLimit("/api/auth/login");
      expect(limit.max).toBe(5);
    });
  });
});
