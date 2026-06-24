/**
 * `ProfessionalTableSkeleton` — a loading placeholder for the
 * professionals table. Mirrors the shape of the real table so the
 * layout doesn't jump when the data resolves.
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

interface ProfessionalTableSkeletonProps {
  /**
   * Number of skeleton rows to render. Defaults to 5.
   */
  rows?: number;
}

export function ProfessionalTableSkeleton({
  rows = 5,
}: ProfessionalTableSkeletonProps) {
  return (
    <div
      className="rounded-lg border"
      data-testid="professional-table-skeleton"
      aria-busy="true"
      aria-label="Cargando profesionales"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="hidden md:table-cell">
              Especialidades
            </TableHead>
            <TableHead className="hidden sm:table-cell">Matrícula</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-32" />
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
