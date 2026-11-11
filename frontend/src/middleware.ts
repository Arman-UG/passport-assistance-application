import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

const ACCESS_COOKIE = "pp_access";
const REFRESH_COOKIE = "pp_refresh";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & api bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const accessCookie = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshCookie = request.cookies.get(REFRESH_COOKIE)?.value;

  let role: string | null = null;
  let isAuthed = false;

  if (accessCookie) {
    try {
      const payload = decodeJwt(accessCookie);
      if (payload && payload.sub) {
        role = (payload.role as string) || "CUSTOMER";
        isAuthed = true;
      }
    } catch {
      isAuthed = false;
    }
  } else if (refreshCookie) {
    // Has refresh token: allow page load, client or BFF will rotate
    isAuthed = true;
  }

  // Protected paths
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthed) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/agent")) {
    if (!isAuthed) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // If role is known and is CUSTOMER, prevent access to agent routes
    if (role && role === "CUSTOMER") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    if (role && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname === "/auth/login" || pathname === "/auth/register") {
    if (isAuthed && role) {
      if (role === "AGENT" || role === "ADMIN") {
        return NextResponse.redirect(new URL("/agent", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
