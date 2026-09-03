import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Deliberately does NOT redirect on a missing cookie.
  //
  // This ran before any client code, so a cookie problem produced an instant
  // bounce to the main site's /login - which, seeing a live session, forwarded
  // to /play. The result was "clicking Admin takes me to the dashboard", with
  // no way to tell whether the session was missing, the cookie was scoped
  // wrongly, or the account simply was not an admin.
  //
  // The app itself now renders an explicit reason for each case, so this hook
  // stays out of the way and lets it.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
