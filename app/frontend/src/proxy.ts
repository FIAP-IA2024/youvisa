import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "youvisa_session";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE);
  const isAuthenticated = session?.value === "authenticated";
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  // Redirect to login if not authenticated and trying to access dashboard
  if (isDashboardRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
