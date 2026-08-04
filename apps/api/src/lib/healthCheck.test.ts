import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("./redis.js", () => ({
  redis: {
    ping: vi.fn(),
  },
}));

import { prisma } from "./prisma.js";
import { redis } from "./redis.js";
import { checkHealth } from "./healthCheck.js";

const mockPrisma = prisma as unknown as { $queryRaw: ReturnType<typeof vi.fn> };
const mockRedis = redis as unknown as { ping: ReturnType<typeof vi.fn> };

describe("checkHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok when all services are healthy", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockRedis.ping.mockResolvedValue("PONG");

    const result = await checkHealth();

    expect(result.status).toBe("ok");
    expect(result.services.postgres.status).toBe("ok");
    expect(result.services.postgres.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.services.redis.status).toBe("ok");
    expect(result.services.redis.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
  });

  it("returns degraded when Postgres is down", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("Connection refused"));
    mockRedis.ping.mockResolvedValue("PONG");

    const result = await checkHealth();

    expect(result.status).toBe("degraded");
    expect(result.services.postgres.status).toBe("error");
    expect(result.services.postgres.error).toBe("Connection refused");
    expect(result.services.redis.status).toBe("ok");
  });

  it("returns degraded when Redis is down", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockRedis.ping.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await checkHealth();

    expect(result.status).toBe("degraded");
    expect(result.services.postgres.status).toBe("ok");
    expect(result.services.redis.status).toBe("error");
    expect(result.services.redis.error).toBe("ECONNREFUSED");
  });

  it("returns degraded when both services are down", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("PG down"));
    mockRedis.ping.mockRejectedValue(new Error("Redis down"));

    const result = await checkHealth();

    expect(result.status).toBe("degraded");
    expect(result.services.postgres.status).toBe("error");
    expect(result.services.redis.status).toBe("error");
  });
});
