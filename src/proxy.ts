import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect for signed-out visitors on private pages. This only
 * checks that a session cookie exists; the real authorisation is done on the
 * server for every page and action (src/server/auth/access.ts).
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/planning/:path*",
    "/recipes/:path*",
    "/shopping/:path*",
    "/pantry/:path*",
    "/household/:path*",
    "/nutrition/:path*",
    "/stores/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
  ],
};
