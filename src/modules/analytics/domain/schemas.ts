/**
 * Analytics domain — Zod 4 schemas.
 *
 * Source of truth for validating analytics query input. The action layer
 * re-validates input against `analyticsQuerySchema` before executing
 * Prisma aggregations.
 *
 * Schemas (see `openspec/changes/analytics/specs/analytics-domain/spec.md`):
 *  - `dateRangeSchema` — preset enum with optional custom from/to bounds.
 *    Uses `.refine()` for custom range validation (from required, from < to).
 *  - `analyticsQuerySchema` — dateRange + optional professionalUserId filter.
 *
 * All error messages in Spanish (project convention).
 */

import { z } from "zod";

import type { DateRange } from "./types";

// ---------------------------------------------------------------------------
// dateRangeSchema — AND-001: preset enum + custom range validation.
// ---------------------------------------------------------------------------

const presetSchema = z.enum(["7d", "30d", "3mo", "6mo", "custom"], {
  error: "Preset inválido",
});

export const dateRangeSchema = z
  .object({
    preset: presetSchema,
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.preset === "custom") {
      // Custom range requires both from and to.
      if (!data.from || !data.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "from y to son requeridos para rango personalizado",
          path: ["from"],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "from y to son requeridos para rango personalizado",
          path: ["to"],
        });
        return;
      }

      // From must be before to.
      if (data.from >= data.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "from debe ser anterior a to",
          path: ["from"],
        });
      }
    }
  });

// ---------------------------------------------------------------------------
// analyticsQuerySchema — wraps dateRange with optional professional filter.
// ---------------------------------------------------------------------------

export const analyticsQuerySchema = z.object({
  dateRange: dateRangeSchema,
  professionalUserId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Inferred types — Zod schema is the single source of truth.
// ---------------------------------------------------------------------------

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;

// Runtime type guard for DateRange (narrows from schema to domain type).
export function isDateRange(input: DateRangeInput): input is DateRange {
  return (
    input.preset !== "custom" ||
    (input.from instanceof Date && input.to instanceof Date)
  );
}
