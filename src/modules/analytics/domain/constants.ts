/**
 * Analytics domain — constants.
 *
 * `DATE_RANGE_PRESETS` defines the available preset date ranges with their
 * labels and day counts. Used by the presentation layer's DateRangeFilter
 * and the helper layer's `getDateBoundaries()`.
 *
 * `METRIC_LABELS` maps each AnalyticsResponse key to a human-readable
 * label for display in the UI.
 *
 * The `as const` + `typeof` pattern is the project convention (see
 * `src/modules/settings/domain/constants.ts`).
 *
 * Spec source: openspec/changes/analytics/specs/analytics-domain/spec.md
 * — AND-001 (presets), AND-002 (metric labels).
 */

// ---------------------------------------------------------------------------
// DATE_RANGE_PRESETS — AND-001: 4 preset ranges.
// ---------------------------------------------------------------------------

export const DATE_RANGE_PRESETS = {
  "7d": { label: "Últimos 7 días", days: 7 },
  "30d": { label: "Últimos 30 días", days: 30 },
  "3mo": { label: "Últimos 3 meses", days: 90 },
  "6mo": { label: "Últimos 6 meses", days: 180 },
} as const;

export type DateRangePresetKey = keyof typeof DATE_RANGE_PRESETS;

// ---------------------------------------------------------------------------
// METRIC_LABELS — AND-002: human-readable labels for all metrics.
// ---------------------------------------------------------------------------

export const METRIC_LABELS = {
  revenue: "Ingresos",
  bookings: "Reservas",
  occupancy: "Ocupación",
  patients: "Pacientes",
  topServices: "Servicios más solicitados",
  topProfessionals: "Profesionales destacados",
  peakHours: "Horas pico",
  dayDistribution: "Distribución por día",
} as const;

export type MetricKey = keyof typeof METRIC_LABELS;
