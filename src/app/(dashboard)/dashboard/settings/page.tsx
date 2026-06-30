/**
 * `/dashboard/settings` — Organization settings page (entry point).
 *
 * Server Component that:
 *  1. Resolves the current `organizationId` (the auth model still
 *     uses a single-org fixture — see `getOrganizationId()`).
 *  2. Reads the settings row via `getSettings(orgId)`, the `"use cache"`
 *     wrapper around `getByOrgId` (PR #2). On greenfield (no row yet)
 *     the cache returns `null` and the page renders the same default
 *     values that the data layer would have populated.
 *  3. Wraps the content in `<Suspense>` with a skeleton fallback so
 *     the page can stream the header immediately and the tabs after
 *     the data resolves. PPR: the header + tabs structure is
 *     pre-rendered, the tab forms (PR #4) are the dynamic island.
 *  4. Hands the cached settings to `<SettingsGuard>` — a Client
 *     Component that enforces per-role access (PROFESSIONAL → redirect,
 *     SECRETARY → `readOnly=true`, ADMIN → `readOnly=false`).
 *
 * The guard uses a function-as-children pattern. The page passes
 * `readOnly` down to the three tab components (PR #4 wires the
 * actual forms; PR #3 only ships the tab structure + placeholders).
 *
 * Why a Server Component for the page:
 *  - `getSettings` is a `"use cache"`-tagged server function. Calling
 *    it from a Client Component would forfeit the cache key.
 *  - The page does no reactive state — perfect for RSC.
 *  - The Client `<SettingsGuard>` and Radix `<Tabs>` are
 *    mounted as small islands inside the server tree.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Tabbed Settings Page
 *   - Requirement: RBAC-Gated Views
 *   - Requirement: Client Guard
 */

import { Suspense } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";

import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getSettings } from "@/modules/settings";
import { SettingsGuard } from "@/modules/settings/presentation/settings-guard";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
// SettingsBody — the data-dependent island. Reads cached settings
// and renders the tabs. PR #4 will replace the placeholder tab
// contents with the real `BusinessTab` / `BookingsTab` /
// `CancellationsTab` forms.
//
// Exported as a named export so the test (and any future Server
// Component re-use) can await it directly. The default export wraps
// it in a Suspense boundary for the production page.
// ---------------------------------------------------------------------------

export async function SettingsBody() {
  const orgId = await getOrganizationId();
  // `getSettings` is the cached read path. It returns `null` on
  // greenfield (no row yet) — the tab forms in PR #4 fall back to
  // `SETTINGS_DEFAULTS` in that case. For PR #3 the placeholders
  // don't need the row.
  await getSettings(orgId);

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
            {/* PR #4: <BusinessTab readOnly={readOnly} /> */}
            <div
              data-testid="tab-business-placeholder"
              className="rounded-md border border-dashed p-6 text-sm text-muted-foreground"
            >
              Próximamente: nombre, dirección, zona horaria, teléfono y email.
            </div>
          </TabsContent>
          <TabsContent value="bookings" className="mt-4">
            {/* PR #4: <BookingsTab readOnly={readOnly} /> */}
            <div
              data-testid="tab-bookings-placeholder"
              className="rounded-md border border-dashed p-6 text-sm text-muted-foreground"
            >
              Próximamente: duración predeterminada, anticipación, máximo por
              día y buffer.
            </div>
          </TabsContent>
          <TabsContent value="cancellations" className="mt-4">
            {/* PR #5: <CancellationsTab readOnly={readOnly} /> */}
            <div
              data-testid="tab-cancellations-placeholder"
              className="rounded-md border border-dashed p-6 text-sm text-muted-foreground"
            >
              Próximamente: habilitar cancelaciones y límite en horas.
            </div>
          </TabsContent>
        </Tabs>
      )}
    </SettingsGuard>
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
// Default export — the Server Component entry.
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader />
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsBody />
      </Suspense>
    </div>
  );
}
