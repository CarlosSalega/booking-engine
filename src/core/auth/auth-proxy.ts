import { NextResponse, type NextRequest } from "next/server";

import { auth } from "./auth-instance";

/**
 * Public route prefixes that always bypass the session check.
 * These match the auth surface area: auth pages, Better Auth HTTP handler,
 * Next.js internals, the favicon, and the public landing page.
 *
 * `"/"` is an exact match — it does NOT act as a prefix for other paths
 * (`"/"` does not start with `"/dashboard"`). The matcher is consumed by
 * `isPublicPath()` which performs an exact-or-prefix check per entry.
 */
export const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/",
] as const;

/**
 * Returns `true` when `pathname` matches one of the public route prefixes.
 *
 * Exported for unit testing — see `src/core/auth/__tests__/auth-proxy.test.ts`.
 * The proxy in `src/app/proxy.ts` short-circuits on these paths before
 * hitting Better Auth (defense in depth with the matcher regex).
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Next.js 16 proxy helper — checks the Better Auth session cookie and either
 * lets the request through or redirects to `/login` (preserving the original
 * URL as `?next=…` so the login page can bounce the user back on success).
 *
 * Used by `src/app/proxy.ts` (configured with a matcher that narrows to
 * private routes only). Public routes are short-circuited before hitting
 * Better Auth.
 */
export async function authProxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (session) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}
