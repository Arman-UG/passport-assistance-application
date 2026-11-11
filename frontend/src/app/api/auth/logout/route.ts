import { NextRequest, NextResponse } from "next/server";
import { getInternalAuthUrl, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

    const authUrl = getInternalAuthUrl();
    await fetch(`${authUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": accessToken ? `Bearer ${accessToken}` : "",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
      body: JSON.stringify({ refreshToken: refreshToken || "" }),
    });
  } catch (ignored) {
    // Fail silently on auth-service logout call
  }

  const response = NextResponse.json({ message: "Logged out" });
  response.cookies.delete(ACCESS_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
  return response;
}
