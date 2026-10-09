import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenEdge, COOKIE_NAME } from "@/lib/auth";

// Routes that require authentication.
const PROTECTED_ROUTES = ["/dashboard", "/invest", "/referral", "/withdraw", "/settings"];

// Routes accessible only when logged out (redirect to dashboard if session exists).
const AUTH_ROUTES = ["/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = token ? !!(await verifyTokenEdge(token)) : false;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Redirect to login if trying to access a protected route without a session
  if (isProtected && !isAuthenticated) {
    const url = new URL("/auth", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if already logged in and visiting auth page
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run proxy only on page routes, skip API/static/_next
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
