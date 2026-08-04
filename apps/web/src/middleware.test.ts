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

function createMockRequest(pathname: string, hasCookie: boolean) {
  return {
    nextUrl: {
      pathname,
    },
    url: "http://localhost:3000",
    cookies: {
      has: (name: string) => (name === "refresh_token" ? hasCookie : false),
    },
  } as unknown as import("next/server").NextRequest;
}

describe("middleware", () => {
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

  it("redirects authenticated users from /login to /play", () => {
    const req = createMockRequest("/login", true);
    middleware(req);
    expect(mockRedirect).toHaveBeenCalled();
    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe("/play");
  });

  it("redirects authenticated users from /register to /play", () => {
    const req = createMockRequest("/register", true);
    middleware(req);
    expect(mockRedirect).toHaveBeenCalled();
    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe("/play");
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
