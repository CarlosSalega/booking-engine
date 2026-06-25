/**
 * Skeleton placeholder shown while the calendar data wrapper streams
 * its bookings. Mirrors the calendar layout: toolbar row + large
 * grid area.
 */

import { Skeleton } from "@/components/ui/skeleton";

export function CalendarSkeleton() {
  return (
    <div className="space-y-4" data-testid="calendar-skeleton">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 flex-wrap">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Calendar grid skeleton */}
      <Skeleton className="h-[800px] max-h-[90vh] w-full rounded-xl" />
    </div>
  );
}
