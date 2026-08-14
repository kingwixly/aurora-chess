import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./logger.js", () => ({
  logger: { fatal: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { validateEnv } from "./env.js";
import { logger } from "./logger.js";

const GOOD = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  JWT_SECRET: "a".repeat(64),
  REDIS_URL: "redis://localhost:6379",
};

describe("validateEnv", () => {
  const original = { ...process.env };
  let exit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...original, ...GOOD, NODE_ENV: "test" };
    exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = original;
    exit.mockRestore();
  });

  it("accepts a valid configuration", () => {
    validateEnv();
    expect(exit).not.toHaveBeenCalled();
  });

  it("refuses to start without a database", () => {
    delete process.env.DATABASE_URL;
    validateEnv();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("refuses a short signing secret", () => {
    // A short secret is brute-forceable, and the failure mode is silent.
    process.env.JWT_SECRET = "tooshort";
    validateEnv();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("refuses a placeholder secret", () => {
    // Somebody copied the example file and never edited it.
    process.env.JWT_SECRET = "change-me-to-a-random-value-please-1234567890";
    validateEnv();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("refuses insecure cookies in production", () => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SECURE = "false";
    process.env.CORS_ORIGIN = "https://aurorachess.org";
    validateEnv();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("refuses an unset CORS origin in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CORS_ORIGIN;
    validateEnv();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("reports every problem at once rather than one per restart", () => {
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    validateEnv();
    const call = (logger.fatal as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0].problems).toHaveLength(2);
  });
});
