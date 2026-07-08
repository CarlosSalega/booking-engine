/**
 * `/dashboard/analytics` — Analytics dashboard page (entry point).
 *
 * Server Component that composes the page from three parts:
 *   1. `<AnalyticsHeader>` — static header with the page title +
 *      back link. Pre-rendered as a PPR static island so it
 *      streams before the data resolves.
 *   2. `<Suspense>` with `<AnalyticsSkeleton>` fallback — the
 *      data-dependent body streams after `getAnalyticsAction`
 *      resolves (cold cache).
 *   3. `<AnalyticsPage>` — the actual RSC body that awaits the
 *      server action and renders KPI cards + charts. Lives in the
 *      presentation layer
 *      (`src/modules/analytics/presentation/analytics-page.tsx`).
 *
 * The split keeps this route file small and testable: the page
 * test only needs to render the static header (a constant) and
 * verify the Suspense wiring; the body's contract (data flow,
 * KPI cards, charts) is covered by `analytics-page.test.tsx` at
 * the presentation location.
 *
 * Why a Server Component for the page:
 *  - `getAnalyticsAction` is a `"use server"` function. Calling
 *    it from a Client Component would forfeit server execution.
 *  - The page does no reactive state — perfect for RSC.
 *  - The Client `<DateRangeFilter>` is mounted as a small island
 *    inside the server tree.
 *
 * Spec: ANP-001 (analytics page), ANP-011 (RBAC gate — handled
 * by layout + action).
 */

import { Suspense } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { AnalyticsPage } from "@/modules/analytics/presentation/analytics-page";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Page header — Analíticas + back link. Pre-rendered as a PPR
// static island so it streams before the data resolves.
// ---------------------------------------------------------------------------

export function AnalyticsHeader() {
  return (
    <div className="flex flex-col gap-2 px-4 pt-4 md:px-6 md:pt-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <BarChart3 className="size-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Analíticas</h1>
          <p className="text-sm text-muted-foreground">
            Métricas de ingresos, reservas y ocupación.
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

export function AnalyticsSkeleton() {
  return (
    <div className="px-4 pb-6 md:px-6" data-testid="analytics-skeleton">
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="mb-4 h-5 w-40" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export — the Server Component entry. Composes header,
// skeleton fallback, and the body in a Suspense boundary.
// ---------------------------------------------------------------------------

export default function AnalyticsRoute() {
  return (
    <div className="flex flex-col gap-4">
      <AnalyticsHeader />
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsPage searchParams={{}} />
      </Suspense>
    </div>
  );
}
