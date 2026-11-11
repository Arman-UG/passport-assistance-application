import { NextRequest, NextResponse } from "next/server";
import { getInternalAppUrl, getInternalAuthUrl, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";

async function attemptRefresh(refreshToken: string): Promise<{ accessToken: string; newRefreshToken: string } | null> {
  try {
    const authUrl = getInternalAuthUrl();
    const res = await fetch(`${authUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { accessToken: data.accessToken, newRefreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

async function handleProxy(request: NextRequest, params: { path: string[] }) {
  // CSRF verification on mutating actions
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const valid = await validateCsrf(request);
    if (!valid) {
      return NextResponse.json({ message: "Invalid or missing CSRF token" }, { status: 403 });
    }
  }

  let accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  let newCookiesToSet: { access?: string; refresh?: string } | null = null;

  // Auto-refresh if no access token but refresh token exists
  if (!accessToken && refreshToken) {
    const refreshed = await attemptRefresh(refreshToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      newCookiesToSet = { access: refreshed.accessToken, refresh: refreshed.newRefreshToken };
    }
  }

  if (!accessToken) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const subPath = params.path.join("/");
  const targetUrl = new URL(`/api/${subPath}`, getInternalAppUrl());
  targetUrl.search = request.nextUrl.search;

  // Build headers
  const forwardHeaders = new Headers();
  forwardHeaders.set("Authorization", `Bearer ${accessToken}`);
  const clientContentType = request.headers.get("content-type");
  if (clientContentType) {
    forwardHeaders.set("Content-Type", clientContentType);
  }

  try {
    let bodyData: any = null;
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      bodyData = await request.arrayBuffer();
    }

    let backendResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
      body: bodyData,
    });

    // If 401 and refresh token available, attempt 1 retry after refresh
    if (backendResponse.status === 401 && refreshToken) {
      const refreshed = await attemptRefresh(refreshToken);
      if (refreshed) {
        newCookiesToSet = { access: refreshed.accessToken, refresh: refreshed.newRefreshToken };
        forwardHeaders.set("Authorization", `Bearer ${refreshed.accessToken}`);
        backendResponse = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: forwardHeaders,
          body: bodyData,
        });
      }
    }

    const resContentType = backendResponse.headers.get("content-type") || "application/octet-stream";
    const resBlob = await backendResponse.arrayBuffer();

    const response = new NextResponse(resBlob, {
      status: backendResponse.status,
      headers: {
        "Content-Type": resContentType,
        "X-Content-Type-Options": "nosniff",
      },
    });

    const disposition = backendResponse.headers.get("content-disposition");
    if (disposition) {
      response.headers.set("Content-Disposition", disposition);
    }

    // Apply rotated cookies if a refresh occurred
    if (newCookiesToSet) {
      const isSecure = process.env.COOKIE_SECURE === "true";
      if (newCookiesToSet.access) {
        response.cookies.set(ACCESS_COOKIE_NAME, newCookiesToSet.access, {
          httpOnly: true,
          secure: isSecure,
          sameSite: "strict",
          path: "/",
          maxAge: 15 * 60,
        });
      }
      if (newCookiesToSet.refresh) {
        response.cookies.set(REFRESH_COOKIE_NAME, newCookiesToSet.refresh, {
          httpOnly: true,
          secure: isSecure,
          sameSite: "strict",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
      }
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { message: "Service unavailable or communication failed", error: err.message },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params);
}
