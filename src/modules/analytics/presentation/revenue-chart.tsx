/**
 * `RevenueChart` — AreaChart showing daily revenue over time.
 *
 * Client Component (Recharts needs the browser). Rendered inside the
 * analytics page after KPICards. Uses dynamic import with `ssr: false`
 * in the parent to avoid SSR hydration mismatches.
 *
 * Spec: ANP-004 (revenue chart).
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

import type { RevenueMetric } from "../domain/types";

const chartConfig = {
  amount: {
    label: "Ingresos",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function dateLabel(iso: string): string {
  // iso is "YYYY-MM-DD". Parse as UTC and format in es-AR.
  const [yearStr, monthStr, dayStr] = iso.split("-");
  if (!yearStr || !monthStr || !dayStr) return iso;
  const d = new Date(
    Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)),
  );
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

interface RevenueChartProps {
  data: RevenueMetric;
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.dailyRevenue.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ingresos diarios</CardTitle>
          <CardDescription>Evolución de ingresos en el período.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay datos de ingresos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  const display = data.dailyRevenue.map((d) => ({
    label: dateLabel(d.date),
    amount: d.amount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos diarios</CardTitle>
        <CardDescription>Evolución de ingresos en el período.</CardDescription>
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
              dataKey="amount"
              type="monotone"
              stroke="var(--color-amount)"
              fill="var(--color-amount)"
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
