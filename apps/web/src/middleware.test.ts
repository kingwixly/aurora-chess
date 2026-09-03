import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NextResponse
const mockRedirect = vi.fn((url: URL) => ({ redirectUrl: url.toString(), type: "redirect" }));
const mockNext = vi.fn(() => ({ type: "next" }));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: URL) => mockRedirect(url),
    next: () => mockNext(),
  },
}));

import { middleware } from "./middleware";

function createMockRequest(pathname: string, hasCookie: boolean, host = "aurorachess.org") {
  return {
    nextUrl: {
      pathname,
    },
    url: `http://${host}:3000${pathname}`,
    headers: {
      get: (name: string) => (name.toLowerCase() === "host" ? host : null),
    },
    cookies: {
      has: (name: string) => (name === "refresh_token" ? hasCookie : false),
    },
  } as unknown as import("next/server").NextRequest;
}

describe("standing subdomain", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockNext.mockClear();
  });

  it("sends any non-standing path on the standing host to the record", () => {
    // Someone landing on standing.aurorachess.org/play should see their record,
    // not a "you are signed out" page about playing chess.
    middleware(createMockRequest("/play", false, "standing.aurorachess.org"));
    expect(mockRedirect).toHaveBeenCalled();
    expect(mockRedirect.mock.calls[0][0].toString()).toContain("/standing");
  });

  it("leaves the standing pages alone on the standing host", () => {
    middleware(createMockRequest("/standing", false, "standing.aurorachess.org"));
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does not redirect a banned user away from appealing", () => {
    // The whole point of the standing site: reachable without a session.
    middleware(createMockRequest("/standing/appeal", false, "standing.aurorachess.org"));
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("sends the standing path on the main host to the subdomain", () => {
    // One address for standing. A punished player should only ever be pointed
    // at one place, and that place has to survive a ban.
    middleware(createMockRequest("/standing", true, "aurorachess.org"));
    expect(mockRedirect).toHaveBeenCalled();
    expect(mockRedirect.mock.calls[0][0].toString()).toContain("standing.aurorachess.org");
  });
});

describe("middleware", () => {
  it("never redirects away from auth pages, even with a cookie present", () => {
    // Middleware cannot tell a valid refresh token from an expired one - it is
    // httpOnly and signed server-side. Redirecting /login to /play on the mere
    // presence of a cookie locked users out entirely once their token expired:
    // /play said "signed out", and clicking Log in bounced straight back.
    for (const path of ["/login", "/register"]) {
      middleware(createMockRequest(path, true));
    }
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users from /play to /login", () => {
    const req = createMockRequest("/play", false);
    middleware(req);
    expect(mockRedirect).toHaveBeenCalled();
    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe("/login");
  });

  it("redirects unauthenticated users from /settings to /login", () => {
    const req = createMockRequest("/settings", false);
    middleware(req);
    expect(mockRedirect).toHaveBeenCalled();
    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe("/login");
  });

  it("redirects unauthenticated users from /history to /login", () => {
    const req = createMockRequest("/history", false);
    middleware(req);
    expect(mockRedirect).toHaveBeenCalled();
  });

  it("redirects unauthenticated users from /friends to /login", () => {
    const req = createMockRequest("/friends", false);
    middleware(req);
    expect(mockRedirect).toHaveBeenCalled();
  });

  it("allows authenticated users to access /play", () => {
    const req = createMockRequest("/play", true);
    middleware(req);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("allows unauthenticated users to access /login", () => {
    const req = createMockRequest("/login", false);
    middleware(req);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("allows anyone to access non-protected routes", () => {
    const req = createMockRequest("/about", false);
    middleware(req);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("allows authenticated users on non-auth routes", () => {
    const req = createMockRequest("/about", true);
    middleware(req);
    expect(mockNext).toHaveBeenCalled();
  });
});
