import { describe, it, expect, beforeAll } from "vitest";
import { initRateLimitConfig, getRouteLimit } from "./rateLimit.js";

describe("route limit matching", () => {
  beforeAll(() => {
    initRateLimitConfig();
  });

  it("matches an exact route", () => {
    expect(getRouteLimit("/api/v1/auth/login").max).toBe(5);
  });

  it("matches admin subroutes by prefix", () => {
    // The bug: a "/api/v1/admin" rule matched nothing, because every real
    // admin route has a segment after it. Moderators fell back to the global
    // limit and were rate limited out of the panel mid-review.
    const global = getRouteLimit("/api/v1/some/unlisted/route").max;
    expect(getRouteLimit("/api/v1/admin/bans").max).toBeGreaterThan(global);
    expect(getRouteLimit("/api/v1/admin/appeals").max).toBeGreaterThan(global);
    expect(getRouteLimit("/api/v1/admin/cheat-reports").max).toBeGreaterThan(global);
  });

  it("still falls back to the global limit for unlisted routes", () => {
    expect(getRouteLimit("/api/v1/leaderboard").max).toBe(100);
  });

  it("does not let a prefix swallow an unrelated route", () => {
    // "/api/v1/admin" must not match "/api/v1/administration".
    expect(getRouteLimit("/api/v1/administration").max).toBe(100);
  });
});
