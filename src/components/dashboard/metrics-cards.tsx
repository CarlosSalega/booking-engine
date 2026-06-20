/**
 * Metrics cards row — six KPI cards shown at the top of the dashboard.
 *
 * Server Component: receives the organizationId and fetches the metrics
 * in parallel with the other dashboard sections. Suspense wraps this
 * component in the page so the cards stream in once the query resolves.
 */

import {
  CalendarCheck2,
  CalendarClock,
  CircleDollarSign,
  TrendingUp,
  UserPlus,
  XCircle,
} from "lucide-react";

import { getDashboardMetrics } from "@/modules/dashboard";
import { formatCurrency, formatNumber } from "@/modules/dashboard";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MetricsCardsProps {
  organizationId: string;
}

export async function MetricsCards({ organizationId }: MetricsCardsProps) {
  const metrics = await getDashboardMetrics(organizationId);

  return (
    <div className="px-4 lg:px-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <CalendarCheck2 className="size-3.5" />
              Reservas hoy
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatNumber(metrics.todayBookings)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              Reservas semana
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatNumber(metrics.weekBookings)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <CircleDollarSign className="size-3.5" />
              Ingresos del mes
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(metrics.monthRevenue)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <XCircle className="size-3.5" />
              Cancelaciones
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatNumber(metrics.cancellations)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <UserPlus className="size-3.5" />
              Clientes nuevos
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatNumber(metrics.newPatients)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5" />
              Ocupación
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {metrics.occupancyRate}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
