import { NextRequest, NextResponse } from "next/server";
import { getInternalAuthUrl, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "No refresh token available" }, { status: 401 });
    }

    const authUrl = getInternalAuthUrl();
    const res = await fetch(`${authUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Refresh failed (or token reuse detected) -> clear cookies
      const response = NextResponse.json(data, { status: res.status });
      response.cookies.delete(ACCESS_COOKIE_NAME);
      response.cookies.delete(REFRESH_COOKIE_NAME);
      return response;
    }

    const response = NextResponse.json({ message: "Refreshed", user: data.user });
    const isSecure = process.env.COOKIE_SECURE === "true";

    response.cookies.set(ACCESS_COOKIE_NAME, data.accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    });

    response.cookies.set(REFRESH_COOKIE_NAME, data.refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ message: "Failed to rotate token" }, { status: 502 });
  }
}
