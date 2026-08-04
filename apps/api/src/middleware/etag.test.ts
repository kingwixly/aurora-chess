import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { registerEtag } from "./etag.js";

describe("ETag middleware", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    registerEtag(app);

    app.get("/test", async () => {
      return { message: "hello" };
    });

    app.post("/test", async () => {
      return { message: "created" };
    });

    app.get("/error", async (_req, reply) => {
      reply.code(404);
      return { error: "not found" };
    });

    let counter = 0;
    app.get("/changing", async () => {
      counter++;
      return { count: counter };
    });

    await app.ready();
  });

  afterAll(() => app.close());

  it("sets ETag header on GET 200 responses", async () => {
    const res = await app.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["etag"]).toBeDefined();
    expect(res.headers["etag"]).toMatch(/^"[a-f0-9]{32}"$/);
  });

  it("does not set ETag on POST requests", async () => {
    const res = await app.inject({ method: "POST", url: "/test" });
    expect(res.headers["etag"]).toBeUndefined();
  });

  it("does not set ETag on non-200 responses", async () => {
    const res = await app.inject({ method: "GET", url: "/error" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["etag"]).toBeUndefined();
  });

  it("returns 304 when If-None-Match matches ETag", async () => {
    const first = await app.inject({ method: "GET", url: "/test" });
    const etag = first.headers["etag"] as string;

    const second = await app.inject({
      method: "GET",
      url: "/test",
      headers: { "if-none-match": etag },
    });

    expect(second.statusCode).toBe(304);
    expect(second.body).toBe("");
  });

  it("returns 200 with new ETag when content changes", async () => {
    const first = await app.inject({ method: "GET", url: "/changing" });
    const etag1 = first.headers["etag"] as string;
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "GET",
      url: "/changing",
      headers: { "if-none-match": etag1 },
    });

    expect(second.statusCode).toBe(200);
    expect(second.headers["etag"]).not.toBe(etag1);
  });

  it("returns same ETag for same content", async () => {
    const first = await app.inject({ method: "GET", url: "/test" });
    const second = await app.inject({ method: "GET", url: "/test" });
    expect(first.headers["etag"]).toBe(second.headers["etag"]);
  });
});
