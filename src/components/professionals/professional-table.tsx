/**
 * `ProfessionalTable` — the data table for the professionals list
 * page.
 *
 * Renders an `EnrichedProfessional[]` as a shadcn/ui Table with
 * columns: Nombre | Email | Especialidades | Matrícula | Estado.
 * Each row links to `/dashboard/professionals/[id]`.
 *
 * The `Estado` column uses `ProfessionalStatusBadge`; the
 * `Especialidades` column shows the comma-separated list from
 * `formatSpecialties`; the `Matrícula` column shows the license
 * string (em-dash when null).
 *
 * Responsive: the table is hidden on small screens in favor of a
 * stacked card layout. The cards show the same data in a more
 * phone-friendly format.
 *
 * Empty state: when `professionals.length === 0`, we delegate to
 * `ProfessionalEmptyState` so the user sees a friendly message.
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
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { EnrichedProfessional } from "@/modules/professionals/data/professional-data.types";
import { formatSpecialties } from "@/modules/professionals/presentation/formatters";

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

import { ProfessionalStatusBadge } from "./professional-status-badge";
import { ProfessionalEmptyState } from "./professional-empty-state";

interface ProfessionalTableProps {
  professionals: EnrichedProfessional[];
  total: number;
  page: number;
  pageSize: number;
}

const NULL_PLACEHOLDER = "—";

export function ProfessionalTable({
  professionals,
  total,
  page,
  pageSize,
}: ProfessionalTableProps) {
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
    return query
      ? `/dashboard/professionals?${query}`
      : "/dashboard/professionals";
  }

  function rowHref(professional: EnrichedProfessional): string {
    return `/dashboard/professionals/${professional.id}`;
  }

  function handleRowActivate(professional: EnrichedProfessional) {
    router.push(rowHref(professional));
  }

  if (professionals.length === 0) {
    return <ProfessionalEmptyState />;
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
              <TableHead className="hidden md:table-cell">
                Especialidades
              </TableHead>
              <TableHead className="hidden sm:table-cell">Matrícula</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professionals.map((professional) => (
              <TableRow
                key={professional.id}
                className="cursor-pointer"
                onClick={() => handleRowActivate(professional)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowActivate(professional);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`Ver detalle de ${professional.fullName}`}
              >
                <TableCell className="font-medium">
                  <Link
                    href={rowHref(professional)}
                    className="block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {professional.fullName}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{professional.email}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatSpecialties(professional.specialties)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {professional.license ?? NULL_PLACEHOLDER}
                </TableCell>
                <TableCell>
                  <ProfessionalStatusBadge status={professional.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile — card stack */}
      <div className="space-y-2 md:hidden">
        {professionals.map((professional) => (
          <Link
            key={professional.id}
            href={rowHref(professional)}
            className="block"
          >
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{professional.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {professional.email}
                    </div>
                  </div>
                  <ProfessionalStatusBadge status={professional.status} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatSpecialties(professional.specialties)}
                </div>
                {professional.license ? (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    Matrícula: {professional.license}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-2 text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages} · {total} profesionales
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
