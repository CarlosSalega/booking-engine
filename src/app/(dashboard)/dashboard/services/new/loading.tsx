/**
 * Loading skeleton for `/dashboard/services/new`.
 *
 * The page fetches `prisma.professional.findMany()` in its Server Component
 * body — until that query resolves, Next.js shows this skeleton so the user
 * gets immediate visual feedback instead of a frozen list page.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function NewServiceLoading() {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-1 h-4 w-72" />
      </div>

      {/* Form fields skeleton — mirrors the 2-column grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Nombre */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* Profesional */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* Descripción (full width) */}
        <div className="space-y-1.5 md:col-span-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* Duración */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* Precio */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* Tipo de pago */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
