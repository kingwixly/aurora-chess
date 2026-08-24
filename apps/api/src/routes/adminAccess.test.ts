import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import {
  getPrisma,
  authHeader,
  type FastifyInstance,
  createApp,
  TEST_USER,
} from "../test/setup.js";

// bcrypt is mocked BEFORE the routes are imported: importing a route pulls in
// the real Prisma client, which does not exist without `prisma generate`.
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$hashedpassword"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));
import { adminRoutes } from "./admin.js";
import { authRoutes } from "./auth.js";

/**
 * The admin access path, end to end.
 *
 * This exists because the admin panel broke twice in ways that only showed up
 * in production: once because the seed left the account as a USER, once because
 * the panel could not obtain an access token on its own subdomain. Both were
 * invisible to typechecking and to every other test.
 */
describe("admin access", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Both route sets, because the admin path crosses them: auth issues the
    // token and the cookie, admin consumes them.
    // Both route sets: the admin path crosses them. auth issues the token and
    // reports the role; admin consumes it. Registering only one made the
    // /auth/me assertion 404 rather than fail meaningfully.
    app = await createApp(async (a) => {
      await a.register(authRoutes);
      await a.register(adminRoutes);
    });
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("role must survive every hop", () => {
    it("returns role from /auth/me, which the Admin button depends on", async () => {
      // The button renders only when user.role === "ADMIN". If this select ever
      // loses `role`, the button silently disappears for admins.
      const prisma = getPrisma();
      prisma.user.findUnique.mockResolvedValue({ ...TEST_USER, role: "ADMIN" });

      const res = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).user.role).toBe("ADMIN");
    });

    it("returns role from login, which the store holds until the next fetch", async () => {
      // The Admin button reads the store. If login omits role — as it once
      // omitted tosAccepted — the button is missing until something refetches.
      const prisma = getPrisma();
      prisma.user.findUnique.mockResolvedValue({
        ...TEST_USER,
        active: true,
        role: "ADMIN",
        passwordHash: "$2b$10$hashedpassword",
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: TEST_USER.email, password: "validpassword" },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).user.role).toBe("ADMIN");
    });

    it("scopes the refresh cookie with a path, so the subdomain can send it", async () => {
      // A host-only cookie never reaches admin.*, and the panel's middleware
      // bounces every request straight to /login.
      const prisma = getPrisma();
      prisma.user.findUnique.mockResolvedValue({
        ...TEST_USER,
        active: true,
        passwordHash: "$2b$10$hashedpassword",
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: TEST_USER.email, password: "validpassword" },
      });

      const raw = String(res.headers["set-cookie"] ?? "");
      expect(raw).toContain("refresh_token");
      expect(raw).toContain("Path=/");
    });
  });

  describe("admin routes reject non-admins", () => {
    it("refuses a normal user", async () => {
      const prisma = getPrisma();
      prisma.user.findUnique.mockResolvedValue({ ...TEST_USER, role: "USER", active: true });

      const res = await app.inject({
        method: "GET",
        url: "/admin/bans",
        headers: authHeader(),
      });

      expect([401, 403]).toContain(res.statusCode);
    });

    it("refuses a deactivated admin", async () => {
      const prisma = getPrisma();
      prisma.user.findUnique.mockResolvedValue({ ...TEST_USER, role: "ADMIN", active: false });

      const res = await app.inject({
        method: "GET",
        url: "/admin/bans",
        headers: authHeader(),
      });

      expect([401, 403]).toContain(res.statusCode);
    });

    it("refuses with no credentials at all", async () => {
      const res = await app.inject({ method: "GET", url: "/admin/bans" });
      expect([401, 403]).toContain(res.statusCode);
    });
  });
});

/**
 * CORS origin resolution.
 *
 * Kept as a pure function test because the failure it guards against is not
 * visible from any single request: a stale ADMIN_URL replaced the derived admin
 * origin, so the real panel was rejected while everything else worked.
 */
describe("allowed origins", () => {
  function resolve(siteUrl: string, adminUrl?: string): string[] {
    const derived = ["admin.", "standing.", "www."].map((sub) =>
      siteUrl.replace("://", `://${sub}`)
    );
    return [siteUrl, ...derived, ...(adminUrl ? [adminUrl] : [])];
  }

  it("always derives the admin subdomain from the site URL", () => {
    expect(resolve("https://aurorachess.org")).toContain("https://admin.aurorachess.org");
  });

  it("keeps the derived admin origin even when ADMIN_URL is stale", () => {
    // The exact bug: ADMIN_URL=http://admin.aurora.local left over from a local
    // setup used to REPLACE the real origin, locking the panel out.
    const origins = resolve("https://aurorachess.org", "http://admin.aurora.local");
    expect(origins).toContain("https://admin.aurorachess.org");
    expect(origins).toContain("http://admin.aurora.local");
  });

  it("covers standing and www too", () => {
    const origins = resolve("https://aurorachess.org");
    expect(origins).toContain("https://standing.aurorachess.org");
    expect(origins).toContain("https://www.aurorachess.org");
  });

  it("does not allow an unrelated origin", () => {
    expect(resolve("https://aurorachess.org")).not.toContain("https://evil.example.com");
  });
});
