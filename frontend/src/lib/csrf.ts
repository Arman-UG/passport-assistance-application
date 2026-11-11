import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import crypto from "crypto";

export const CSRF_COOKIE_NAME = "pp_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function validateCsrf(request: NextRequest): Promise<boolean> {
  // Safe methods do not require CSRF token
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return true;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison
  try {
    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
