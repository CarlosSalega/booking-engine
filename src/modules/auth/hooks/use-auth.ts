"use client";

import { createAuthClient } from "@/core/auth/auth-client";

/**
 * Client-side Better Auth instance — shared with `use-session.ts` for
 * the reactive session store. Imported fresh here so this file stays
 * usable without depending on the session module's runtime side
 * effects.
 */
const authClient = createAuthClient();

/**
 * One-stop auth hook.
 *
 * Wraps the three user-facing flows on top of the Better Auth client:
 * - `login` → `signIn.email({ email, password })`
 * - `register` → `signUp.email({ email, password, name })`
 * - `logout` → `signOut()`
 *
 * Plus a reactive `session` view (same atom-backed source as `useSession`,
 * exposed here so a component can read session + trigger actions from a
 * single hook).
 *
 * Methods return the raw Better Auth response/error. UI components are
 * expected to branch on `result.error` and surface a Spanish message.
 */
export function useAuth() {
  const session = authClient.useSession();

  return {
    session,
    login: (email: string, password: string) =>
      authClient.signIn.email({ email, password }),
    register: (email: string, password: string, name: string) =>
      authClient.signUp.email({ email, password, name }),
    logout: () => authClient.signOut(),
  };
}
