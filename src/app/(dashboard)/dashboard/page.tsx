/**
 * /dashboard — the operator landing page.
 *
 * Server Component. Streams each section independently via Suspense
 * so the metrics row, the charts, and the tables can all render as
 * soon as their queries resolve, without blocking the whole layout.
 *
 * Charts (Recharts) are loaded with `next/dynamic({ ssr: false })` to
 * keep the initial bundle small.
 */

import { Suspense } from "react";

import { getOrganizationId } from "@/modules/dashboard";
import { getBookingsByDay, getRevenueByMonth } from "@/modules/dashboard";

import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { TodayBookings } from "@/components/dashboard/today-bookings";
import { TopServices } from "@/components/dashboard/top-services";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import {
  BookingsChartClient,
  RevenueChartClient,
} from "@/components/dashboard/charts";
import { Skeleton } from "@/components/ui/skeleton";

export default async function DashboardPage() {
  const organizationId = await getOrganizationId();

  // Pre-fetch the chart and table data so the Suspense boundaries can
  // stream them in parallel with the metrics.
  const [revenueData, bookingsByDayData] = await Promise.all([
    getRevenueByMonth(organizationId),
    getBookingsByDay(organizationId),
  ]);

  return (
    <>
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Resumen operativo de tu consultorio.
        </p>
      </div>

      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsCards organizationId={organizationId} />
      </Suspense>

      <div className="px-4 lg:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <RevenueChartClient data={revenueData} />
          </div>
          <div className="lg:col-span-3">
            <BookingsChartClient data={bookingsByDayData} />
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
            <TopServicesData organizationId={organizationId} />
          </Suspense>
          <div className="flex flex-col gap-4">
            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-xl" />}>
              <TodayBookingsData organizationId={organizationId} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-xl" />}>
              <RecentActivityData organizationId={organizationId} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Data-loading wrappers — needed because Suspense only works on
// components that read dynamic data (cookies/headers/promises). Each
// thin wrapper does exactly one async query and renders the matching
// presentational component, keeping the page as the composition root.
// ---------------------------------------------------------------------------

async function TopServicesData({ organizationId }: { organizationId: string }) {
  await Promise.resolve(); // force the async boundary
  return <TopServices organizationId={organizationId} />;
}

async function TodayBookingsData({ organizationId }: { organizationId: string }) {
  await Promise.resolve();
  return <TodayBookings organizationId={organizationId} />;
}

async function RecentActivityData({ organizationId }: { organizationId: string }) {
  await Promise.resolve();
  return <RecentActivity organizationId={organizationId} />;
}

function MetricsSkeleton() {
  return (
    <div className="px-4 lg:px-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
