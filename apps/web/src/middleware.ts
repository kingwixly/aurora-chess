import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route hints only.
 *
 * Middleware runs at the edge and **cannot validate a session** — the refresh
 * token is httpOnly and signed server-side, so all this can see is whether a
 * cookie exists, not whether it is still good.
 *
 * That distinction caused a redirect loop that survived for months: an expired
 * cookie is still a present cookie, so /login bounced to /play, /play found the
 * session invalid and offered "Log in", and the click bounced straight back.
 * Clearing cookies by hand was the only way out.
 *
 * So: **auth pages are never redirected away from here.** A signed-in user
 * visiting /login is redirected by the page itself, which knows whether the
 * session is real. Being sent to /login when already signed in is a minor
 * annoyance; being unable to reach /login at all is a locked door.
 */
const protectedRoutes = [
  "/play",
  "/friends",
  "/settings",
  "/history",
  "/collections",
  "/invites",
  "/stats",
  "/puzzles",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A missing cookie definitely means no session, so this redirect is safe —
  // it can produce a false "signed out", never a false "signed in".
  if (
    protectedRoutes.some((r) => pathname.startsWith(r)) &&
    !request.cookies.has("refresh_token")
  ) {
    const url = new URL("/login", request.url);
    // Come back here after signing in.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/play/:path*",
    "/friends/:path*",
    "/settings",
    "/history",
    "/collections/:path*",
    "/invites",
    "/stats",
    "/puzzles",
  ],
};
