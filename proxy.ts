import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // This is intentionally only a fast redirect. Route handlers verify sessions authoritatively.
  if (!request.cookies.get("better-auth.session_token")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*"] };
