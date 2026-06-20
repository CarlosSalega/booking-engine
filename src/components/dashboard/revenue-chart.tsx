/**
 * Revenue chart — area chart of approved payments grouped by month
 * over the last 6 months.
 *
 * Client Component (Recharts needs the browser). Imported by the page
 * with `next/dynamic({ ssr: false })` so it never blocks the initial
 * server-rendered HTML.
 */

"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import { formatCurrency } from "@/modules/dashboard/presentation/formatters";
import type { RevenueByMonth } from "@/modules/dashboard/data/dashboard-data";

const chartConfig = {
  revenue: {
    label: "Ingresos",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function monthLabel(yyyymm: string): string {
  // yyyymm is "YYYY-MM" (UTC). Parse to a Date in UTC and format in es-AR.
  const [yearStr, monthStr] = yyyymm.split("-");
  if (!yearStr || !monthStr) return yyyymm;
  const d = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

interface RevenueChartProps {
  data: RevenueByMonth[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const display = data.map((p) => ({
    label: monthLabel(p.month),
    revenue: p.revenue,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos por mes</CardTitle>
        <CardDescription>
          Pagos aprobados en los últimos 6 meses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <AreaChart
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
              tickFormatter={(value: number) =>
                new Intl.NumberFormat("es-AR", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(value)
              }
              width={60}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <Area
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-revenue)"
              fill="var(--color-revenue)"
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
