/**
 * Client-only chart wrappers.
 *
 * Next.js 16 forbids `next/dynamic({ ssr: false })` inside Server
 * Components, so the page (Server Component) imports these wrappers
 * (Client Component) and they own the dynamic import of Recharts.
 *
 * The wrappers are dumb: they take the data from props and pass it
 * straight to the chart component. Recharts itself is bundled into a
 * separate chunk that the browser only fetches when the charts
 * actually mount.
 */

"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { BookingsByDay, RevenueByMonth } from "@/modules/dashboard/data/dashboard-data";

const RevenueChart = dynamic(
  () => import("./revenue-chart").then((m) => m.RevenueChart),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> },
);

const BookingsChart = dynamic(
  () => import("./bookings-chart").then((m) => m.BookingsChart),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> },
);

export function RevenueChartClient({ data }: { data: RevenueByMonth[] }) {
  return <RevenueChart data={data} />;
}

export function BookingsChartClient({ data }: { data: BookingsByDay[] }) {
  return <BookingsChart data={data} />;
}
