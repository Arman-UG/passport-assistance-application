/**
 * Client-side API client wrapper for communicating with Next.js BFF routes.
 * Automatically injects the CSRF token from the pp_csrf cookie on mutating requests.
 */

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )pp_csrf=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  // Add CSRF header for state-changing requests
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  // Ensure JSON header if passing body unless it's FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const status = res.status;

    if (status === 204) {
      return { data: null, error: null, status };
    }

    const contentType = res.headers.get("content-type");
    let json: any = null;
    if (contentType && contentType.includes("application/json")) {
      json = await res.json();
    }

    if (!res.ok) {
      const errorMsg =
        json?.message ||
        json?.error ||
        json?.detail ||
        (json?.details ? JSON.stringify(json.details) : `Request failed with status ${status}`);
      return { data: null, error: errorMsg, status };
    }

    return { data: json as T, error: null, status };
  } catch (err: any) {
    return { data: null, error: err.message || "Network request failed", status: 0 };
  }
}
