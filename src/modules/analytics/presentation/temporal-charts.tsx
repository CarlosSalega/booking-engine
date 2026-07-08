/**
 * `TemporalCharts` — two BarCharts for temporal booking patterns.
 *
 * Client Component (Recharts needs the browser). Shows:
 * - Peak hours: BarChart with X = hour (0–23), Y = booking count
 * - Day distribution: BarChart with X = day of week (Lun–Dom), Y = count
 *
 * Spec: ANP-007 (temporal charts — peak hours + day distribution).
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

import type { DayDistributionMetric, PeakHourMetric } from "../domain/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

const peakHoursConfig = {
  count: {
    label: "Reservas",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const dayDistributionConfig = {
  count: {
    label: "Reservas",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TemporalChartsProps {
  peakHours: PeakHourMetric[];
  dayDistribution: DayDistributionMetric[];
}

export function TemporalCharts({ peakHours, dayDistribution }: TemporalChartsProps) {
  const peakDisplay = peakHours.map((p) => ({
    label: formatHour(p.hour),
    count: p.count,
  }));

  const dayDisplay = dayDistribution.map((d) => ({
    label: DAY_LABELS[d.dayOfWeek] ?? `D${d.dayOfWeek}`,
    count: d.count,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Horas pico</CardTitle>
          <CardDescription>Distribución de reservas por hora del día.</CardDescription>
        </CardHeader>
        <CardContent>
          {peakHours.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay datos de horas pico para mostrar.
            </p>
          ) : (
            <ChartContainer config={peakHoursConfig} className="h-[260px] w-full">
              <BarChart
                data={peakDisplay}
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
                  width={40}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value) => `${value} reservas`}
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Day Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución semanal</CardTitle>
          <CardDescription>Reservas por día de la semana.</CardDescription>
        </CardHeader>
        <CardContent>
          {dayDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay datos de distribución semanal para mostrar.
            </p>
          ) : (
            <ChartContainer config={dayDistributionConfig} className="h-[260px] w-full">
              <BarChart
                data={dayDisplay}
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
                  width={40}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value) => `${value} reservas`}
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
