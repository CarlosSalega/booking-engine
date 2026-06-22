/**
 * `PatientTableSkeleton` — a loading placeholder for the patients
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

interface PatientTableSkeletonProps {
  /**
   * Number of skeleton rows to render. Defaults to 5.
   */
  rows?: number;
}

export function PatientTableSkeleton({ rows = 5 }: PatientTableSkeletonProps) {
  return (
    <div
      className="rounded-lg border"
      data-testid="patient-table-skeleton"
      aria-busy="true"
      aria-label="Cargando pacientes"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="hidden md:table-cell">Teléfono</TableHead>
            <TableHead className="hidden md:table-cell">DNI</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden lg:table-cell">Creado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-28" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
