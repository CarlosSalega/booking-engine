/**
 * Client-only chart wrappers for the analytics module.
 *
 * Next.js 16 forbids `next/dynamic({ ssr: false })` inside Server
 * Components, so the page (Server Component) imports these wrappers
 * (Client Component) and they own the dynamic import of Recharts.
 *
 * Mirrors the pattern from `src/components/dashboard/charts.tsx`.
 */

"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { BookingMetric, OccupancyMetric, RevenueMetric } from "../domain/types";

const RevenueChart = dynamic(
  () => import("./revenue-chart").then((m) => m.RevenueChart),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> },
);

const BookingsChart = dynamic(
  () => import("./bookings-chart").then((m) => m.BookingsChart),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> },
);

const OccupancyChart = dynamic(
  () => import("./occupancy-chart").then((m) => m.OccupancyChart),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> },
);

export function RevenueChartClient({ data }: { data: RevenueMetric }) {
  return <RevenueChart data={data} />;
}

export function BookingsChartClient({ data }: { data: BookingMetric }) {
  return <BookingsChart data={data} />;
}

export function OccupancyChartClient({ data }: { data: OccupancyMetric }) {
  return <OccupancyChart data={data} />;
}
