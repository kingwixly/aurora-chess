import { describe, it, expect, vi, beforeAll } from "vitest";

// Set JWT_SECRET before any imports that touch jwt.ts
vi.stubEnv("JWT_SECRET", "test-secret");

let authMiddleware: typeof import("./auth.js").authMiddleware;
let signAccessToken: typeof import("../lib/jwt.js").signAccessToken;

beforeAll(async () => {
  const jwtMod = await import("../lib/jwt.js");
  signAccessToken = jwtMod.signAccessToken;
  const authMod = await import("./auth.js");
  authMiddleware = authMod.authMiddleware;
});

async function buildApp() {
  const Fastify = (await import("fastify")).default;
  const app = Fastify({ logger: false });

  app.get("/protected", { preHandler: authMiddleware }, async (request) => {
    return { user: request.user };
  });

  return app;
}

describe("authMiddleware", () => {
  it("should set request.user with a valid Bearer token", async () => {
    const app = await buildApp();
    const token = signAccessToken({
      userId: "u1",
      email: "a@b.com",
      username: "alice",
      role: "USER",
    });

    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user.userId).toBe("u1");
    expect(body.user.username).toBe("alice");
    expect(body.user.email).toBe("a@b.com");
    expect(body.user.role).toBe("USER");
  });

  it("should return 401 when Authorization header is missing", async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/protected",
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Missing or invalid token");
  });

  it("should return 401 when Authorization header lacks Bearer prefix", async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Token some-jwt-here" },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Missing or invalid token");
  });

  it("should return 401 with an invalid/expired token", async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer invalid.token.value" },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Invalid or expired token");
  });

  it("should return 401 with a tampered token", async () => {
    const app = await buildApp();
    const token = signAccessToken({
      userId: "u1",
      email: "a@b.com",
      username: "alice",
      role: "USER",
    });
    const tampered = token.slice(0, -5) + "XXXXX";

    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Bearer ${tampered}` },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Invalid or expired token");
  });
});
