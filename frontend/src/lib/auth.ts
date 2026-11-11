import { cookies } from "next/headers";
import { decodeJwt } from "jose";

export const ACCESS_COOKIE_NAME = "pp_access";
export const REFRESH_COOKIE_NAME = "pp_refresh";

export interface UserSession {
  userId: string;
  role: "CUSTOMER" | "AGENT" | "ADMIN";
  sessionId: string;
  fullName?: string;
  email?: string;
}

export function getInternalAuthUrl(): string {
  return process.env.INTERNAL_AUTH_SERVICE_URL || "http://auth-service:8080";
}

export function getInternalAppUrl(): string {
  return process.env.INTERNAL_APP_SERVICE_URL || "http://app-service:8000";
}

export async function getServerSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const claims = decodeJwt(token);
    if (!claims || !claims.sub) {
      return null;
    }

    // Check expiry
    const exp = claims.exp ? claims.exp * 1000 : 0;
    if (exp && Date.now() > exp) {
      return null;
    }

    return {
      userId: claims.sub as string,
      role: (claims.role as "CUSTOMER" | "AGENT" | "ADMIN") || "CUSTOMER",
      sessionId: (claims.sessionId as string) || "",
    };
  } catch {
    return null;
  }
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  const isSecure = process.env.COOKIE_SECURE === "true";

  // Access token: 15 minutes, HttpOnly, SameSite Strict
  cookieStore.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "strict",
    path: "/",
    maxAge: 15 * 60, // 15 mins
  });

  // Refresh token: 7 days, HttpOnly, SameSite Strict, restricted path
  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);
}
