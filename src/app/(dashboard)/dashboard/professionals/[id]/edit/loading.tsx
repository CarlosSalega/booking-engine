/**
 * Loading skeleton for `/dashboard/professionals/[id]/edit`.
 *
 * The page fetches orgId + `getProfessionalById()`.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function ProfessionalEditLoading() {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-1 h-4 w-72" />
      </div>

      {/* Form skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-24 w-full" />
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
