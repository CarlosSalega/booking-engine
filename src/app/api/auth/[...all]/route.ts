import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/core/auth";

/**
 * Better Auth HTTP handler.
 *
 * Better Auth exposes every auth endpoint (sign-in, sign-up, sign-out, session,
 * password-reset, etc.) under `/api/auth/*` and expects a Next.js route
 * handler mounted at the catch-all `[...all]` segment. `toNextJsHandler`
 * adapts Better Auth's Web `Request` → `Response` handler to the App Router
 * signature by binding it to GET/POST (and PATCH/PUT/DELETE for future
 * endpoints that need them).
 *
 * Mounting path: `src/app/api/auth/[...all]/route.ts` → `/api/auth/[...all]`.
 */
export const { GET, POST } = toNextJsHandler(auth);
