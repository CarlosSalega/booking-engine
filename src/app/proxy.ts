import { type NextRequest } from "next/server";

import { authProxy } from "@/core/auth/auth-proxy";

/**
 * Next.js 16 proxy — wires Better Auth session enforcement to the routing
 * layer. Replaces the legacy `middleware.ts` (deprecated in Next.js 16).
 *
 * The helper does the actual session check + redirect; the matcher below
 * is the first line of defense and narrows the proxy to private routes
 * only. Public routes (`/login`, `/register`, `/api/auth/*`, Next.js
 * internals, favicon) skip the proxy entirely, so we don't pay the cost
 * of a session lookup on every public request.
 *
 * `authProxy` ALSO short-circuits public paths internally as a safety net
 * (defense in depth): even if the matcher is loosened, the helper will
 * still pass public routes through.
 */
export default function proxy(request: NextRequest) {
  return authProxy(request);
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
};
