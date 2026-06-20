"use client";

import { createAuthClient } from "@/core/auth/auth-client";

/**
 * Client-side Better Auth instance.
 *
 * Singleton at the module level so all components share the same
 * reactive session store. `createAuthClient()` already returns a
 * `useSession` hook bound to its internal nanostore — re-exporting it
 * keeps consumers using a single import path (`@/modules/auth/hooks`)
 * without losing reactivity.
 */
const authClient = createAuthClient();

/**
 * Reactive session hook — `{ data, isPending, isRefetching, error, refetch }`.
 *
 * `data` is `null` when the user is unauthenticated and a `Session`
 * (with `user` including the `role` additional field) when authenticated.
 */
export const useSession = authClient.useSession;
