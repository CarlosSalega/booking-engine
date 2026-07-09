/**
 * `KPICards` — 4 KPI cards for the analytics dashboard.
 *
 * Server Component that renders Revenue, Bookings, Occupancy, and
 * Patients cards with formatted values. Uses formatters from the
 * dashboard module for consistent es-AR formatting.
 *
 * Spec: ANP-003 (KPI cards).
 */

import { formatCurrency, formatNumber } from "@/modules/dashboard/presentation/formatters";

import type { AnalyticsResponse } from "../domain/types";

interface KPICardsProps {
  data: AnalyticsResponse;
}

export function KPICards({ data }: KPICardsProps) {
  const occupancyPercent = Math.round(data.occupancy.rate * 100);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Revenue */}
      <div data-testid="kpi-revenue" className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Ingresos totales</p>
        <p className="text-2xl font-semibold">{formatCurrency(data.revenue.total)}</p>
      </div>

      {/* Bookings */}
      <div data-testid="kpi-bookings" className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Reservas</p>
        <p className="text-2xl font-semibold">{formatNumber(data.bookings.total)}</p>
      </div>

      {/* Occupancy */}
      <div data-testid="kpi-occupancy" className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Ocupación</p>
        <p className="text-2xl font-semibold">{occupancyPercent}%</p>
      </div>

      {/* Patients */}
      <div data-testid="kpi-patients" className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Pacientes</p>
        <p className="text-2xl font-semibold">{formatNumber(data.patients.totalUnique)}</p>
      </div>
    </div>
  );
}
