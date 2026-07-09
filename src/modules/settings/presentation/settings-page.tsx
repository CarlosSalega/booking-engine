/**
 * `SettingsPage` — the Server Component body of `/dashboard/settings`.
 *
 * Reads the cached `OrganizationSettings` row and resolves the
 * current user's role server-side (same pattern the dashboard layout
 * uses at `src/app/(dashboard)/layout.tsx`). RBAC gating runs here
 * instead of in a Client Component wrapper so no function-as-children
 * pattern crosses the RSC boundary.
 *
 * Flow:
 *   1. `getOrganizationId()` — resolves the current `orgId` from
 *      the session (single-org fixture for now).
 *   2. `auth.api.getSession()` — resolves the session server-side
 *      via `headers()` (Next.js dynamic API, forces dynamic rendering
 *      for this route segment).
 *   3. Role check: PROFESSIONAL → `redirect("/dashboard")` (same
 *      behavior the old `SettingsGuard` had). SECRETARY →
 *      `readOnly=true`, ADMIN → `readOnly=false`.
 *   4. `getSettings(orgId)` — cached read via `"use cache"` +
 *      `cacheTag("settings")`. On greenfield, returns `null` and
 *      the tab forms fall back to `SETTINGS_DEFAULTS`.
 *   5. shadcn/ui `<Tabs>` with three sections: **Negocio**, **Reservas**,
 *      **Cancelaciones**. Each form is a Client Component (uses
 *      `useTransition + useState`) that calls the corresponding
 *      Server Action.
 *   6. When `readOnly=true`, a "view-only" banner sits above the
 *      tab content so SECRETARY users understand why every field
 *      is disabled.
 *
 * The RSC is a pure function (no client state, no effects) — its
 * async work is the two data reads + session resolution. The route
 * file wraps it in `<Suspense>` so the header streams immediately
 * and the body is the dynamic island.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Tabbed Settings Page
 *   - Requirement: RBAC-Gated Views → Scenario: Secretary read-only
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth-instance";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getSettings } from "@/modules/settings";
import { USER_ROLE } from "@/modules/auth/domain/roles";
import { BusinessTab } from "@/modules/settings/presentation/tabs/business-tab";
import { BookingsTab } from "@/modules/settings/presentation/tabs/bookings-tab";
import { CancellationsTab } from "@/modules/settings/presentation/tabs/cancellations-tab";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/**
 * The settings page body. Server Component (no `"use client"`).
 *
 * Resolves session + settings on the server and renders the tabbed UI
 * with a `readOnly` flag derived from the user's role. Returns a fully
 * resolved React tree — the `<Suspense>` boundary lives in the route
 * file (`page.tsx`).
 */
export async function SettingsPage() {
  const [orgId, session] = await Promise.all([
    getOrganizationId(),
    auth.api.getSession({ headers: await headers() }),
  ]);

  const role = (session?.user as { role?: string } | undefined)?.role;

  // PROFESSIONAL users cannot access the settings page — redirect
  // to the dashboard (same behavior the old client-side guard had).
  if (role === USER_ROLE.PROFESSIONAL) {
    redirect("/dashboard");
  }

  // SECRETARY is read-only; ADMIN (and any unauthenticated user that
  // reached this page despite the layout's redirect) is read-write.
  const readOnly = role === USER_ROLE.SECRETARY;

  // `getSettings` is the cached read path. It returns `null` on
  // greenfield (no row yet) — the tab forms fall back to
  // `SETTINGS_DEFAULTS` in that case (see `buildInitialState` in
  // each tab).
  const settings = await getSettings(orgId);

  return (
    <Tabs defaultValue="business" className="px-4 pb-6 md:px-6">
      <TabsList>
        <TabsTrigger value="business">Negocio</TabsTrigger>
        <TabsTrigger value="bookings">Reservas</TabsTrigger>
        <TabsTrigger value="cancellations">Cancelaciones</TabsTrigger>
      </TabsList>
      {readOnly ? (
        <div
          role="status"
          data-testid="settings-readonly-banner"
          className="mt-4 rounded-md border border-dashed bg-muted/50 px-4 py-2 text-sm text-muted-foreground"
        >
          Modo sólo lectura — contactá al administrador para editar la
          configuración.
        </div>
      ) : null}
      <TabsContent value="business" className="mt-4">
        <BusinessTab settings={settings} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="bookings" className="mt-4">
        <BookingsTab settings={settings} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="cancellations" className="mt-4">
        <CancellationsTab settings={settings} readOnly={readOnly} />
      </TabsContent>
    </Tabs>
  );
}
