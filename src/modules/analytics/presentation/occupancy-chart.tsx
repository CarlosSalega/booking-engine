/**
 * `OccupancyChart` — BarChart showing occupancy rate percentage.
 *
 * Client Component (Recharts needs the browser). Shows a single bar
 * for "Ocupación" with the rate value. Includes slot details below.
 *
 * Spec: ANP-006 (occupancy chart).
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

import type { OccupancyMetric } from "../domain/types";

const chartConfig = {
  rate: {
    label: "Ocupación",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

interface OccupancyChartProps {
  data: OccupancyMetric;
}

export function OccupancyChart({ data }: OccupancyChartProps) {
  if (data.totalSlots === 0 && data.rate === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasa de ocupación</CardTitle>
          <CardDescription>Porcentaje de turnos ocupados en el período.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay datos de ocupación para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  const ratePercent = Math.round(data.rate * 100);

  const chartData = [
    {
      name: "Ocupación",
      rate: ratePercent,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasa de ocupación</CardTitle>
        <CardDescription>Porcentaje de turnos ocupados en el período.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <p className="text-3xl font-bold">{ratePercent}%</p>
          <p className="text-sm text-muted-foreground">
            {data.occupiedSlots} de {data.totalSlots} turnos
          </p>
          <ChartContainer config={chartConfig} className="h-[120px] w-full max-w-[300px]">
            <BarChart
              data={chartData}
              margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value: number) => `${value}%`}
                width={40}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value) => `${value}%`}
                  />
                }
              />
              <Bar
                dataKey="rate"
                fill="var(--color-rate)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
