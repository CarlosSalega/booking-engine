"use client";

/**
 * `StatusFilter` — a generic, URL-driven single-value Select filter.
 *
 * Renders a shadcn `Select` populated from an `options` array. The
 * selected value is synced to a URL search param (default `status`);
 * changing the filter resets pagination to page 1 and calls
 * `router.push` with the updated query string.
 *
 * Built for the dashboard list pages (patients, services,
 * professionals, payments) so the filter UX is consistent across
 * modules. Each feature module wraps this component with its own
 * options, base path, and test id.
 */

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatusFilterOption {
  /** The URL search-param value. Use `StatusFilter.ALL_VALUE` for
   *  the "show everything" sentinel. */
  value: string;
  /** Display label shown in the dropdown. */
  label: string;
}

export interface StatusFilterProps {
  /** Ordered list of filter options. The first option is treated as
   *  the "all" / default choice (its value is used when the URL has
   *  no `paramKey` set). */
  options: ReadonlyArray<StatusFilterOption>;
  /** The base path for URL construction (e.g. "/dashboard/patients").
   *  The component appends `?status=...` (or whatever `paramKey` is). */
  basePath: string;
  /** The URL search-param key. Defaults to "status". */
  paramKey?: string;
  /** Accessible label for the filter trigger. */
  label?: string;
  /** `data-testid` attribute on the Select trigger. */
  testId?: string;
}

// ---------------------------------------------------------------------------
// Sentinel
// ---------------------------------------------------------------------------

/**
 * Sentinel value that represents "no filter" / "show all". When the
 * Select value equals this sentinel the param is removed from the URL
 * rather than set to a literal `"__all__"`.
 */
export const ALL_VALUE = "__all__";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusFilter({
  options,
  basePath,
  paramKey = "status",
  label = "Estado",
  testId,
}: StatusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const raw = searchParams.get(paramKey) ?? "";
  const current = raw || ALL_VALUE;

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === ALL_VALUE) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, next);
    }
    // Reset pagination when the filter changes.
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger
          className="h-8 w-fit min-w-[140px]"
          aria-label={`Filtrar por ${label.toLowerCase()}`}
          data-testid={testId}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
