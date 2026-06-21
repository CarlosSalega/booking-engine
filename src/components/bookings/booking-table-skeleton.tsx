/**
 * `BookingTableSkeleton` — a loading placeholder for the bookings
 * table. Mirrors the shape of the real table so the layout doesn't
 * jump when the data resolves.
 *
 * Marked "use client" because the table is a Client Component and
 * React 19 still benefits from consistent boundaries. The skeleton
 * itself is pure markup — no state.
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

interface BookingTableSkeletonProps {
  /**
   * Number of skeleton rows to render. Defaults to 5.
   */
  rows?: number;
}

export function BookingTableSkeleton({ rows = 5 }: BookingTableSkeletonProps) {
  return (
    <div
      className="rounded-lg border"
      data-testid="booking-table-skeleton"
      aria-busy="true"
      aria-label="Cargando reservas"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead className="hidden md:table-cell">
              Profesional
            </TableHead>
            <TableHead className="hidden lg:table-cell">Servicio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden sm:table-cell">Pago</TableHead>
            <TableHead className="text-right">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-4 w-16" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
