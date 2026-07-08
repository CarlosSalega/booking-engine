/**
 * `BookingsChart` — PieChart showing bookings by status.
 *
 * Client Component (Recharts needs the browser). Shows three slices:
 * Confirmadas (green), Canceladas (red), Completadas (blue).
 *
 * Spec: ANP-005 (bookings chart).
 */

"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { BookingMetric } from "../domain/types";

const STATUS_COLORS: Record<string, string> = {
  Confirmadas: "hsl(142, 76%, 36%)",
  Canceladas: "hsl(0, 84%, 60%)",
  Completadas: "hsl(217, 91%, 60%)",
};

interface BookingsChartProps {
  data: BookingMetric;
}

export function BookingsChart({ data }: BookingsChartProps) {
  if (data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reservas por estado</CardTitle>
          <CardDescription>Distribución de reservas en el período.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay datos de reservas para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  const slices = [
    { name: "Confirmadas", value: data.confirmed },
    { name: "Canceladas", value: data.cancelled },
    { name: "Completadas", value: data.completed },
  ].filter((s) => s.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas por estado</CardTitle>
        <CardDescription>Distribución de reservas en el período.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-[200px] w-[200px]">
            <PieChart width={200} height={200}>
              <Pie
                data={slices}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {slices.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] ?? "hsl(210, 40%, 60%)"}
                  />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div className="flex flex-col gap-2">
            {slices.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[entry.name] }}
                />
                <span className="text-sm">{entry.name}</span>
                <span className="text-sm font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
