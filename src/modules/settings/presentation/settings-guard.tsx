/**
 * `SettingsGuard` — Client Component for the `/dashboard/settings` page.
 *
 * Wraps the settings UI and enforces per-role access. The guard is
 * the second of three RBAC boundaries (the others being the
 * dashboard layout and the Server Actions). The layering rationale:
 *
 *   - Dashboard layout:     unauthenticated → `/login`,
 *                           PATIENT        → `/` (public landing)
 *   - `SettingsGuard`:      PROFESSIONAL   → `/dashboard` (this file),
 *                           SECRETARY      → `readOnly=true`,
 *                           ADMIN          → `readOnly=false`
 *   - Server Actions:       ADMIN-only (defense in depth)
 *
 * The unauthenticated case is INTENTIONALLY a no-op here. The
 * dashboard layout redirects unauthenticated users to `/login`; if
 * this guard also redirected, the two would race. We render `null`
 * and let the layout boundary handle it.
 *
 * The guard uses a function-as-children pattern so the rendered
 * children can read the `readOnly` flag directly — the tab forms
 * (PR #4) will use this to disable their fields. This is a thin
 * Client Component; it does NOT import any settings data or
 * Server Actions, keeping it focused on routing decisions.
 *
 * "use client" is mandatory: `useSession()` is a Better Auth
 * reactive hook that subscribes to a nanostore; it requires the
 * browser runtime. The page that uses this guard is a Server
 * Component (it can `await` the cached `getSettings(orgId)`), but
 * the guard itself is a Client island.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: RBAC-Gated Views
 *   - Requirement: Client Guard
 */

"use client";

import { redirect } from "next/navigation";
import toast from "react-hot-toast";

import { USER_ROLE, type UserRoleType } from "@/modules/auth/domain/roles";
import { useSession } from "@/modules/auth/hooks/use-session";

interface SettingsGuardProps {
  /**
   * Function-as-children: receives the resolved `readOnly` flag and
   * returns the actual UI. The flag is `true` for SECRETARY,
   * `false` for ADMIN. PROFESSIONAL and PATIENT never reach the
   * children — they trigger `redirect()` first.
   */
  children: (readOnly: boolean) => React.ReactNode;
}

export function SettingsGuard({ children }: SettingsGuardProps) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role as
    | UserRoleType
    | undefined;

  // Unauthenticated: the dashboard layout handles it. We render
  // nothing instead of redirecting to avoid a race between the
  // two boundaries.
  if (!session?.user || !role) {
    return null;
  }

  // Defense in depth: the dashboard layout already redirects PATIENT
  // users away, but if a PATIENT somehow lands here (e.g. via a
  // direct URL during a route-segment bug), bounce them out.
  if (role === USER_ROLE.PATIENT) {
    toast.error("Acceso denegado");
    redirect("/dashboard");
  }

  // PROFESSIONAL: redirect with a Spanish access-denied toast.
  if (role === USER_ROLE.PROFESSIONAL) {
    toast.error("Acceso denegado");
    redirect("/dashboard");
  }

  // ADMIN and SECRETARY reach the children. SECRETARY is read-only.
  const readOnly = role === USER_ROLE.SECRETARY;
  return <>{children(readOnly)}</>;
}
