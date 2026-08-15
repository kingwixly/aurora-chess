import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, number>();
const ttls = new Map<string, number>();

vi.mock("./redis.js", () => ({
  redis: {
    incr: vi.fn(async (k: string) => {
      const n = (store.get(k) ?? 0) + 1;
      store.set(k, n);
      return n;
    }),
    decr: vi.fn(async (k: string) => {
      const n = Math.max(0, (store.get(k) ?? 0) - 1);
      store.set(k, n);
      return n;
    }),
    expire: vi.fn(async (k: string, s: number) => {
      ttls.set(k, s);
      return 1;
    }),
    ttl: vi.fn(async (k: string) => ttls.get(k) ?? -1),
  },
}));
vi.mock("./logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { checkSignupVelocity, releaseSignupAttempt, VELOCITY_LIMITS } from "./signupVelocity.js";
import { redis } from "./redis.js";

describe("signup velocity", () => {
  beforeEach(() => {
    store.clear();
    ttls.clear();
    vi.clearAllMocks();
  });

  it("allows a first signup", async () => {
    expect((await checkSignupVelocity("1.2.3.4", "abc123def456")).allowed).toBe(true);
  });

  it("allows a normal household sharing one address", async () => {
    // Two or three people on one connection is ordinary, not suspicious.
    for (let i = 0; i < 3; i++) {
      const r = await checkSignupVelocity("1.2.3.4", `device${i}0000000`);
      expect(r.allowed).toBe(true);
    }
  });

  it("stops bulk signups from one address", async () => {
    for (let i = 0; i < VELOCITY_LIMITS.IP_LIMIT; i++) {
      await checkSignupVelocity("1.2.3.4", `device${i}0000000`);
    }
    const r = await checkSignupVelocity("1.2.3.4", "deviceX0000000");
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("ip");
  });

  it("holds one device to a tighter limit than one address", async () => {
    // A fingerprint is far more specific than an address, so it can be
    // stricter without catching a whole building.
    expect(VELOCITY_LIMITS.DEVICE_LIMIT).toBeLessThan(VELOCITY_LIMITS.IP_LIMIT);
    for (let i = 0; i < VELOCITY_LIMITS.DEVICE_LIMIT; i++) {
      await checkSignupVelocity(`10.0.0.${i}`, "samedevice12345");
    }
    const r = await checkSignupVelocity("10.0.0.99", "samedevice12345");
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("device");
  });

  it("tells the caller when to try again", async () => {
    for (let i = 0; i <= VELOCITY_LIMITS.IP_LIMIT; i++) {
      await checkSignupVelocity("5.5.5.5", null);
    }
    const r = await checkSignupVelocity("5.5.5.5", null);
    expect(r.retryAfter).toBeGreaterThan(0);
  });

  it("refunds an attempt that failed validation", async () => {
    // A typo'd username must not spend one of someone's tries.
    await checkSignupVelocity("7.7.7.7", "dev777aaaaaaaaa");
    await releaseSignupAttempt("7.7.7.7", "dev777aaaaaaaaa");
    expect(store.get("signup:ip:7.7.7.7")).toBe(0);
  });

  it("works with no device fingerprint at all", async () => {
    // Fingerprinting can be blocked; that must not break signup.
    expect((await checkSignupVelocity("8.8.8.8", null)).allowed).toBe(true);
  });

  it("fails OPEN when Redis is down", async () => {
    // An outage must not close the front door. The alternative is a site that
    // silently stops accepting players whenever a dependency wobbles.
    vi.mocked(redis.incr).mockRejectedValueOnce(new Error("connection refused"));
    expect((await checkSignupVelocity("9.9.9.9", "dev999aaaaaaaaa")).allowed).toBe(true);
  });
});
