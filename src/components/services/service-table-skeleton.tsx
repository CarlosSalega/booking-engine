/**
 * `ServiceTableSkeleton` — a loading placeholder for the services
 * table. Mirrors the shape of the real table so the layout doesn't
 * jump when the data resolves.
 *
 * Marked "use client" because the table is a Client Component and
 * React 19 still benefits from consistent boundaries. The skeleton
 * itself is pure markup — no state.
 *
 * The default `rows=5` matches the patient / booking skeletons so
 * the loading experience is consistent across list pages.
 */

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ServiceTableSkeletonProps {
  /**
   * Number of skeleton rows to render. Defaults to 5.
   */
  rows?: number;
}

export function ServiceTableSkeleton({ rows = 5 }: ServiceTableSkeletonProps) {
  return (
    <div
      className="rounded-lg border"
      data-testid="service-table-skeleton"
      aria-busy="true"
      aria-label="Cargando servicios"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="hidden lg:table-cell">
              Profesional
            </TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo de pago</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-4 w-20" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
