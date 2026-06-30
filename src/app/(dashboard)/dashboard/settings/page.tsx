/**
 * `/dashboard/settings` — Organization settings page (entry point).
 *
 * Server Component that composes the page from three parts:
 *   1. `<SettingsHeader>` — static header with the page title +
 *      back link. Pre-rendered as a PPR static island so it
 *      streams before the data resolves.
 *   2. `<Suspense>` with `<SettingsSkeleton>` fallback — the
 *      data-dependent body streams after `getSettings(orgId)`
 *      resolves (cold cache).
 *   3. `<SettingsPage>` — the actual RSC body that reads cached
 *      settings and renders the tabbed UI inside `<SettingsGuard>`.
 *      Lives in the presentation layer
 *      (`src/modules/settings/presentation/settings-page.tsx`).
 *
 * The split keeps this route file small and testable: the page
 * test only needs to render the static header (a constant) and
 * verify the Suspense wiring; the body's contract (data flow,
 * tabs, banner) is covered by `settings-page.test.tsx` at the
 * presentation location.
 *
 * Why a Server Component for the page:
 *  - `getSettings` is a `"use cache"`-tagged server function.
 *    Calling it from a Client Component would forfeit the cache
 *    key.
 *  - The page does no reactive state — perfect for RSC.
 *  - The Client `<SettingsGuard>` and Radix `<Tabs>` are mounted
 *    as small islands inside the server tree.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Tabbed Settings Page
 *   - Requirement: RBAC-Gated Views
 *   - Requirement: Client Guard
 */

import { Suspense } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";

import { SettingsPage } from "@/modules/settings/presentation/settings-page";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Re-export the body under its previous name so the existing
// `app/(dashboard)/dashboard/settings/__tests__/page.test.tsx`
// (which imports `SettingsBody` from this module) keeps working
// after the PR #5 refactor. The body itself is defined in
// `@/modules/settings/presentation/settings-page.tsx`.
export { SettingsPage as SettingsBody } from "@/modules/settings/presentation/settings-page";

// ---------------------------------------------------------------------------
// Page header — Configuración + back link. Pre-rendered as a PPR
// static island so it streams before the data resolves.
// ---------------------------------------------------------------------------

export function SettingsHeader() {
  return (
    <div className="flex flex-col gap-2 px-4 pt-4 md:px-6 md:pt-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Settings2 className="size-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
          <p className="text-sm text-muted-foreground">
            Ajustes de la cuenta, organización y preferencias.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Volver al panel</Link>
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton — shown while the body is suspended (cold cache).
// ---------------------------------------------------------------------------

export function SettingsSkeleton() {
  return (
    <div className="px-4 pb-6 md:px-6" data-testid="settings-skeleton">
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="mt-4 h-32 w-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export — the Server Component entry. Composes header,
// skeleton fallback, and the body in a Suspense boundary.
// ---------------------------------------------------------------------------

export default function SettingsRoute() {
  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader />
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsPage />
      </Suspense>
    </div>
  );
}
