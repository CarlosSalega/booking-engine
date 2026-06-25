/**
 * `PaymentTableSkeleton` — a loading placeholder for the payments
 * table. Mirrors the shape of the real `PaymentTable` so the layout
 * doesn't jump when the data resolves.
 *
 * 7-column layout (matches the real table):
 *   Fecha | Paciente | Profesional | Servicio | Monto | Estado | Acciones
 *
 * The default `rows=5` matches the patient / professional skeletons
 * so the loading experience is consistent across list pages.
 *
 * Server-renderable (no hooks, no events). Marked "use client" so it
 * can be safely used as a Suspense fallback inside a Client parent
 * if needed; the skeleton itself is pure markup — no state.
 */

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PaymentTableSkeletonProps {
  /**
   * Number of skeleton rows to render. Defaults to 5.
   */
  rows?: number;
}

export function PaymentTableSkeleton({ rows = 5 }: PaymentTableSkeletonProps) {
  return (
    <div
      className="rounded-lg border"
      data-testid="payment-table-skeleton"
      aria-busy="true"
      aria-label="Cargando pagos"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead className="hidden md:table-cell">Profesional</TableHead>
            <TableHead className="hidden md:table-cell">Servicio</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
