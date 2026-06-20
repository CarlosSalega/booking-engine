/**
 * Top services card — list of the 5 most-booked services.
 *
 * Server Component. Renders an empty state when there are no bookings
 * yet. Each row shows a service name, the booking count, and a simple
 * progress bar that visualizes the rank relative to the leader.
 */

import { BarChart3 } from "lucide-react";

import { getTopServices, formatNumber } from "@/modules/dashboard";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TopServicesProps {
  organizationId: string;
}

export async function TopServices({ organizationId }: TopServicesProps) {
  const services = await getTopServices(organizationId);
  const maxCount = services[0]?.count ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Servicios más usados</CardTitle>
        <CardDescription>
          Top 5 según cantidad de reservas acumuladas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <BarChart3 className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Todavía no hay reservas registradas.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {services.map((service) => {
              const pct =
                maxCount > 0 ? Math.round((service.count / maxCount) * 100) : 0;
              return (
                <li key={service.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{service.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {formatNumber(service.count)}{" "}
                      {service.count === 1 ? "reserva" : "reservas"}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${service.name}: ${pct}% del líder`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
