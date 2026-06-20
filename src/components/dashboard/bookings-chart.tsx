/**
 * Bookings chart — bar chart of bookings created per day over the
 * last 7 days.
 *
 * Client Component (Recharts needs the browser). Imported by the page
 * with `next/dynamic({ ssr: false })` so it never blocks the initial
 * server-rendered HTML.
 */

"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { BookingsByDay } from "@/modules/dashboard/data/dashboard-data";

const chartConfig = {
  count: {
    label: "Reservas",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function dayLabel(yyyymmdd: string): string {
  // yyyymmdd is "YYYY-MM-DD" (UTC). Parse to a Date in UTC and format in es-AR.
  const [yearStr, monthStr, dayStr] = yyyymmdd.split("-");
  if (!yearStr || !monthStr || !dayStr) return yyyymmdd;
  const d = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)));
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

interface BookingsChartProps {
  data: BookingsByDay[];
}

export function BookingsChart({ data }: BookingsChartProps) {
  const display = data.map((p) => ({
    label: dayLabel(p.date),
    count: p.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas por día</CardTitle>
        <CardDescription>
          Turnos creados en los últimos 7 días.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart
            data={display}
            margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={32}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" hideLabel />}
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
