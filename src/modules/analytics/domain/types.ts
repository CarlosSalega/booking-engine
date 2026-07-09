/**
 * Analytics domain — types and metric interfaces.
 *
 * Source of truth for the analytics module's domain model. These types
 * are used across the data layer (Prisma aggregations), action layer
 * (RBAC + Zod validation), and presentation layer (charts + KPIs).
 *
 * Spec source: openspec/changes/analytics/specs/analytics-domain/spec.md
 * — AND-001 (DateRange), AND-002 (Metric types).
 *
 * Design: openspec/changes/analytics/design.md — Interfaces / Contracts.
 */

// ---------------------------------------------------------------------------
// DateRange — AND-001: preset or custom with from/to bounds.
// ---------------------------------------------------------------------------

export type DateRangePreset = "7d" | "30d" | "3mo" | "6mo";

export type DateRange =
  | { preset: DateRangePreset }
  | { preset: "custom"; from: Date; to: Date };

// ---------------------------------------------------------------------------
// Metric interfaces — AND-002: flat structure, number for counts/rates,
// string for dates (ISO 8601).
// ---------------------------------------------------------------------------

export interface DailyRevenue {
  date: string;
  amount: number;
}

export interface MonthlyRevenue {
  month: string;
  amount: number;
}

export interface RevenueMetric {
  total: number;
  averagePerBooking: number;
  dailyRevenue: DailyRevenue[];
  monthlyRevenue: MonthlyRevenue[];
}

export interface BookingMetric {
  total: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  completionRate: number;
}

export interface OccupancyMetric {
  occupiedSlots: number;
  totalSlots: number;
  rate: number;
}

export interface PatientMetric {
  newPatients: number;
  returningPatients: number;
  totalUnique: number;
}

export interface ServiceMetric {
  serviceId: string;
  serviceName: string;
  count: number;
  revenue: number;
}

export interface ProfessionalMetric {
  professionalUserId: string;
  name: string;
  count: number;
  revenue: number;
  occupancyRate: number;
}

export interface PeakHourMetric {
  hour: number;
  count: number;
}

export interface DayDistributionMetric {
  dayOfWeek: number;
  count: number;
}

// ---------------------------------------------------------------------------
// AnalyticsResponse — aggregates all metrics into a single response.
// ---------------------------------------------------------------------------

export interface AnalyticsResponse {
  revenue: RevenueMetric;
  bookings: BookingMetric;
  occupancy: OccupancyMetric;
  patients: PatientMetric;
  topServices: ServiceMetric[];
  topProfessionals: ProfessionalMetric[];
  peakHours: PeakHourMetric[];
  dayDistribution: DayDistributionMetric[];
}
