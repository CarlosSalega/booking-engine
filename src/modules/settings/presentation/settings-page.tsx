/**
 * `SettingsPage` — the Server Component body of `/dashboard/settings`.
 *
 * Reads the cached `OrganizationSettings` row and renders the tabbed
 * UI inside `<SettingsGuard>`. Lives in the presentation layer (per
 * the design's module tree) so the route file in the App Router
 * (`app/(dashboard)/dashboard/settings/page.tsx`) can stay a thin
 * wrapper that just composes Header + Suspense + this body.
 *
 * Flow:
 *   1. `getOrganizationId()` — resolves the current `orgId` from
 *      the session (single-org fixture for now).
 *   2. `getSettings(orgId)` — cached read via `"use cache"` +
 *      `cacheTag("settings")` (PR #2). On greenfield, returns
 *      `null` and the tab forms fall back to `SETTINGS_DEFAULTS`.
 *   3. `<SettingsGuard>` — Client Component that gates per-role
 *      access (PROFESSIONAL → redirect, SECRETARY → `readOnly=true`,
 *      ADMIN → `readOnly=false`). Uses a function-as-children
 *      pattern so the tabs can read the `readOnly` flag directly.
 *   4. shadcn/ui `<Tabs>` with three sections: **Negocio** (the
 *      `BusinessTab` form from PR #4), **Reservas** (the
 *      `BookingsTab` form from PR #4), **Cancelaciones** (the
 *      `CancellationsTab` form from PR #5). Each form is
 *      `useTransition + useState` and calls the corresponding
 *      Server Action.
 *   5. When `readOnly=true`, a "view-only" banner sits above the
 *      tab content so SECRETARY users understand why every field
 *      is disabled.
 *
 * The RSC is a pure function (no client state, no effects) — its
 * only async work is the `getOrganizationId()` / `getSettings()`
 * read. The route file wraps it in `<Suspense>` so the header
 * streams immediately and the body is the dynamic island.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Tabbed Settings Page
 *   - Requirement: RBAC-Gated Views → Scenario: Secretary read-only
 *   - Requirement: Client Guard
 */

import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getSettings } from "@/modules/settings";
import { SettingsGuard } from "@/modules/settings/presentation/settings-guard";
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
 * Reads the cached settings row + renders the tabbed UI inside the
 * per-role guard. Returns a fully resolved React tree — the
 * `<Suspense>` boundary lives in the route file (`page.tsx`).
 */
export async function SettingsPage() {
  const orgId = await getOrganizationId();
  // `getSettings` is the cached read path. It returns `null` on
  // greenfield (no row yet) — the tab forms fall back to
  // `SETTINGS_DEFAULTS` in that case (see `buildInitialState` in
  // each tab).
  const settings = await getSettings(orgId);

  return (
    <SettingsGuard>
      {(readOnly) => (
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
      )}
    </SettingsGuard>
  );
}
