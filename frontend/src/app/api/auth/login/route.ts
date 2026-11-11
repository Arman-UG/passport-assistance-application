import { NextRequest, NextResponse } from "next/server";
import { getInternalAuthUrl } from "@/lib/auth";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const authUrl = getInternalAuthUrl();
    const res = await fetch(`${authUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
        "User-Agent": request.headers.get("user-agent") || "NextJS-BFF",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const response = NextResponse.json({
      message: "Login successful",
      user: data.user,
    });

    const isSecure = process.env.COOKIE_SECURE === "true";

    // Set HttpOnly access token (15 mins)
    response.cookies.set("pp_access", data.accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    });

    // Set HttpOnly refresh token (7 days)
    response.cookies.set("pp_refresh", data.refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    // Set readable CSRF cookie
    const csrfToken = generateCsrfToken();
    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: isSecure,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to communicate with authentication service" },
      { status: 502 }
    );
  }
}
