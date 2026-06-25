/**
 * `PatientTable` — the data table for the patients list page.
 *
 * Renders an `EnrichedPatient[]` as a shadcn/ui Table with columns:
 * Nombre | Email | Teléfono | DNI | Estado | Creado por. Each row
 * links to `/dashboard/patients/[id]`.
 *
 * The `Estado` column uses `PatientStatusBadge`; the `Creado por`
 * column shows `createdByUserName` (or "—" when the creator user
 * has been deleted).
 *
 * Responsive: the table is hidden on small screens in favor of a
 * stacked card layout. The cards show the same data in a more
 * phone-friendly format.
 *
 * Empty state: when `patients.length === 0`, we delegate to
 * `PatientEmptyState` so the user sees a friendly message and a way
 * to clear filters.
 *
 * Pure presentational: no fetching, no auth, no router mutation. The
 * parent page owns data and the URL state.
 */

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { EnrichedPatient } from "@/modules/patients/data/patient-data.types";

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

import { PatientStatusBadge } from "./patient-status-badge";
import { PatientEmptyState } from "./patient-empty-state";

interface PatientTableProps {
  patients: EnrichedPatient[];
  total: number;
  page: number;
  pageSize: number;
}

export function PatientTable({
  patients,
  total,
  page,
  pageSize,
}: PatientTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function pageHref(p: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const query = params.toString();
    return query ? `/dashboard/patients?${query}` : "/dashboard/patients";
  }

  function rowHref(patient: EnrichedPatient): string {
    return `/dashboard/patients/${patient.id}`;
  }

  function handleRowActivate(patient: EnrichedPatient) {
    router.push(rowHref(patient));
  }

  if (patients.length === 0) {
    return <PatientEmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Desktop / tablet — full table */}
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Teléfono</TableHead>
              <TableHead className="hidden md:table-cell">DNI</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">
                Creado por
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow
                key={patient.id}
                className="cursor-pointer"
                onClick={() => handleRowActivate(patient)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowActivate(patient);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`Ver detalle de ${patient.fullName}`}
              >
                <TableCell className="font-medium">{patient.fullName}</TableCell>
                <TableCell>
                  <div className="text-sm">{patient.email || "—"}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {patient.phone || "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell tabular-nums">
                  {patient.documentId || "—"}
                </TableCell>
                <TableCell>
                  <PatientStatusBadge status={patient.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {patient.createdByUserName || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile — card stack */}
      <div className="space-y-2 md:hidden">
        {patients.map((patient) => (
          <Link
            key={patient.id}
            href={`/dashboard/patients/${patient.id}`}
            className="block"
          >
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{patient.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {patient.email || "—"}
                    </div>
                  </div>
                  <PatientStatusBadge status={patient.status} />
                </div>
                {(patient.phone || patient.documentId) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {patient.phone && <span>{patient.phone}</span>}
                    {patient.documentId && (
                      <span className="tabular-nums">
                        DNI: {patient.documentId}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-2 text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages} · {total} pacientes
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
