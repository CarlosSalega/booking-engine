/**
 * `ServiceTable` — the data table for the services list page.
 *
 * Renders an `EnrichedService[]` as a shadcn/ui Table with columns:
 * Nombre | Profesional | Precio | Tipo de pago | Estado. Each row
 * links to `/dashboard/services/[id]`.
 *
 * The `Estado` column uses `ServiceStatusBadge`; the `Tipo de pago`
 * column shows the es-AR payment-type label from the presentation
 * formatters.
 *
 * Responsive: the table is hidden on small screens in favor of a
 * stacked card layout. The cards show the same data in a more
 * phone-friendly format.
 *
 * Empty state: when `services.length === 0`, we delegate to
 * `ServiceEmptyState` so the user sees a friendly message.
 *
 * Pure presentational: no fetching, no auth, no router mutation. The
 * parent page owns data and the URL state.
 *
 * Pagination: when `pageSize < total`, the bottom renders a small
 * "Anterior / Siguiente" pair. The page index is in the URL, so
 * the table is pure — the parent passes the current page down.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PaymentType } from "@/modules/services/domain/service";
import type { EnrichedService } from "@/modules/services/data/service-data.types";
import {
  formatPrice,
  getPaymentTypeLabel,
} from "@/modules/services/presentation/formatters";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { ServiceStatusBadge } from "./service-status-badge";
import { ServiceEmptyState } from "./service-empty-state";

interface ServiceTableProps {
  services: EnrichedService[];
  total: number;
  page: number;
  pageSize: number;
}

export function ServiceTable({
  services,
  total,
  page,
  pageSize,
}: ServiceTableProps) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function pageHref(p: number): string {
    if (typeof window === "undefined") return "#";
    const params = new URLSearchParams(window.location.search);
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const query = params.toString();
    return query ? `/dashboard/services?${query}` : "/dashboard/services";
  }

  function rowHref(service: EnrichedService): string {
    return `/dashboard/services/${service.id}`;
  }

  function handleRowActivate(service: EnrichedService) {
    router.push(rowHref(service));
  }

  if (services.length === 0) {
    return <ServiceEmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Desktop / tablet — full table */}
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden lg:table-cell">
                Profesional
              </TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="hidden sm:table-cell">
                Tipo de pago
              </TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow
                key={service.id}
                className="cursor-pointer"
                onClick={() => handleRowActivate(service)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowActivate(service);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`Ver detalle de ${service.name}`}
              >
                <TableCell className="font-medium">
                  <Link
                    href={rowHref(service)}
                    className="block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {service.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {service.professionalName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {service.price ? formatPrice(service.price.amount) : "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {getPaymentTypeLabel(service.paymentType)}
                </TableCell>
                <TableCell>
                  <ServiceStatusBadge status={service.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile — card stack */}
      <div className="space-y-2 md:hidden">
        {services.map((service) => (
          <Link
            key={service.id}
            href={rowHref(service)}
            className="block"
          >
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {service.professionalName}
                    </div>
                  </div>
                  <ServiceStatusBadge status={service.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {getPaymentTypeLabel(service.paymentType)}
                  </span>
                  <span className="font-medium tabular-nums">
                    {service.price ? formatPrice(service.price.amount) : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-2 text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages} · {total} servicios
          </span>
          <div className="flex items-center gap-2">
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPrev}
            >
              <Link
                href={hasPrev ? pageHref(page - 1) : "#"}
                aria-disabled={!hasPrev}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Link>
            </Button>
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNext}
            >
              <Link
                href={hasNext ? pageHref(page + 1) : "#"}
                aria-disabled={!hasNext}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
