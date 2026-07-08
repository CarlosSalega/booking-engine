/**
 * `TopServices` — ranked list of top services by booking count.
 *
 * Server Component that shows up to 5 services with their booking
 * count and revenue formatted in ARS.
 *
 * Spec: ANP-007 (top services list).
 */

import { formatCurrency } from "@/modules/dashboard/presentation/formatters";

import type { ServiceMetric } from "../domain/types";

const MAX_ITEMS = 5;

interface TopServicesProps {
  data: ServiceMetric[];
}

export function TopServices({ data }: TopServicesProps) {
  const items = data.slice(0, MAX_ITEMS);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-lg font-semibold">Servicios más reservados</h3>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay servicios con reservas en este período.
        </p>
      ) : (
        <ol className="space-y-3">
          {items.map((service, index) => (
            <li
              key={service.serviceId}
              data-testid={`top-service-${index + 1}`}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {index + 1}.
                </span>
                <span className="font-medium">{service.serviceName}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {service.count} reservas
                </span>
                <span className="font-medium">{formatCurrency(service.revenue)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
