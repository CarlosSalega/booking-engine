/**
 * Analytics data provider.
 *
 * Server-only data access for the analytics module. Every function takes
 * an `organizationId` so the queries are tenant-scoped. Aggregations use
 * Prisma `groupBy` + `_sum`/`_count` against existing models — zero
 * in-memory grouping except for computed temporal fields (hour, dayOfWeek,
 * day, month) where Prisma does not support groupBy on expressions.
 *
 * Design: openspec/changes/analytics/design.md — Single analytics-data.ts.
 * Pattern: mirrors `src/modules/settings/data/settings-data.ts`.
 */

import { prisma } from "@/lib/prisma";

import type {
  BookingMetric,
  DateRange,
  DayDistributionMetric,
  OccupancyMetric,
  PatientMetric,
  PeakHourMetric,
  ProfessionalMetric,
  RevenueMetric,
  ServiceMetric,
} from "../domain/types";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Prisma where clause for approved payments. */
const APPROVED_PAYMENT_STATUS = "APPROVED";

/**
 * Build a Prisma date-range filter for a date field.
 */
function dateRangeFilter(from: Date, to: Date) {
  return { gte: from, lte: to };
}

/**
 * Format a Date to ISO date string (YYYY-MM-DD).
 */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Format a Date to year-month string (YYYY-MM).
 */
function toYearMonth(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/**
 * Resolve a DateRange to concrete from/to dates.
 */
function resolveDateRange(dateRange: DateRange): { from: Date; to: Date } {
  if (dateRange.preset === "custom") {
    return { from: dateRange.from, to: dateRange.to };
  }

  const now = new Date();
  const presetDays = PRESET_DAYS[dateRange.preset];
  const from = new Date(now);
  from.setDate(from.getDate() - presetDays);
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

const PRESET_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "3mo": 90,
  "6mo": 180,
};

// ---------------------------------------------------------------------------
// getRevenueMetrics — Payment aggregation (AND-003, AND-005)
// ---------------------------------------------------------------------------

/**
 * Aggregates revenue metrics from approved payments within a date range.
 *
 * Returns total revenue, average per booking, daily breakdown, and monthly
 * breakdown. Returns zeroed metric with empty arrays when no approved
 * payments exist (AND-005).
 */
export async function getRevenueMetrics(
  organizationId: string,
  dateRange: DateRange,
  professionalUserId?: string,
): Promise<RevenueMetric> {
  const { from, to } = resolveDateRange(dateRange);

  const bookingWhere: Record<string, unknown> = {
    organizationId,
    startTime: dateRangeFilter(from, to),
  };
  if (professionalUserId) {
    bookingWhere["professionalId"] = professionalUserId;
  }

  const paymentWhere: Record<string, unknown> = {
    organizationId,
    status: APPROVED_PAYMENT_STATUS,
    booking: bookingWhere,
  };

  // Total revenue + count for average.
  const aggregate = await prisma.payment.aggregate({
    where: paymentWhere,
    _sum: { amount: true },
    _count: { _all: true },
  });

  const total = aggregate._sum.amount ?? 0;
  const count = aggregate._count._all;
  const averagePerBooking = count > 0 ? total / count : 0;

  // Fetch approved payments with booking startTime for time-series grouping.
  const payments = await prisma.payment.findMany({
    where: paymentWhere,
    select: {
      amount: true,
      booking: { select: { startTime: true } },
    },
  });

  // Group by day (pure helper — Prisma groupBy does not support expressions).
  const dailyMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>();

  for (const payment of payments) {
    const date = payment.booking.startTime;
    const dayKey = toDateString(date);
    const monthKey = toYearMonth(date);

    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + payment.amount);
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + payment.amount);
  }

  const dailyRevenue = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  const monthlyRevenue = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  return { total, averagePerBooking, dailyRevenue, monthlyRevenue };
}

// ---------------------------------------------------------------------------
// getDailyRevenue — standalone daily breakdown (used by charts)
// ---------------------------------------------------------------------------

/**
 * Returns daily revenue breakdown for a date range.
 */
export async function getDailyRevenue(
  organizationId: string,
  dateRange: DateRange,
  professionalUserId?: string,
): Promise<{ date: string; amount: number }[]> {
  const result = await getRevenueMetrics(
    organizationId,
    dateRange,
    professionalUserId,
  );
  return result.dailyRevenue;
}

// ---------------------------------------------------------------------------
// getMonthlyRevenue — standalone monthly breakdown (used by charts)
// ---------------------------------------------------------------------------

/**
 * Returns monthly revenue breakdown for a date range.
 */
export async function getMonthlyRevenue(
  organizationId: string,
  dateRange: DateRange,
  professionalUserId?: string,
): Promise<{ month: string; amount: number }[]> {
  const result = await getRevenueMetrics(
    organizationId,
    dateRange,
    professionalUserId,
  );
  return result.monthlyRevenue;
}

// ---------------------------------------------------------------------------
// getBookingMetrics — Booking status aggregation (AND-003, AND-005)
// ---------------------------------------------------------------------------

/**
 * Aggregates booking metrics by status within a date range.
 *
 * Returns total, confirmed, cancelled, completed counts and completion rate.
 * Returns zeroed metric when no bookings exist (AND-005).
 */
export async function getBookingMetrics(
  organizationId: string,
  dateRange: DateRange,
  professionalUserId?: string,
): Promise<BookingMetric> {
  const { from, to } = resolveDateRange(dateRange);

  const where: Record<string, unknown> = {
    organizationId,
    startTime: dateRangeFilter(from, to),
  };
  if (professionalUserId) {
    where["professionalId"] = professionalUserId;
  }

  const rows = await prisma.booking.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  let total = 0;
  let confirmed = 0;
  let cancelled = 0;
  let completed = 0;

  for (const row of rows) {
    const count = row._count._all;
    total += count;

    switch (row.status) {
      case "CONFIRMED":
        confirmed = count;
        break;
      case "CANCELLED":
        cancelled = count;
        break;
      case "COMPLETED":
        completed = count;
        break;
      // PENDING and other statuses are counted in total only.
    }
  }

  const completionRate = total > 0 ? completed / total : 0;

  return { total, confirmed, cancelled, completed, completionRate };
}

// ---------------------------------------------------------------------------
// getOccupancyMetrics — Slot occupancy (AND-003, AND-005)
// ---------------------------------------------------------------------------

/**
 * Computes occupancy as occupiedSlots / totalSlots.
 * totalSlots = maxBookingsPerDay × number of days in range.
 * occupiedSlots = booking count within the range.
 *
 * The caller passes maxBookingsPerDay from OrganizationSettings.
 */
export async function getOccupancyMetrics(
  organizationId: string,
  dateRange: DateRange,
  maxBookingsPerDay: number,
  professionalUserId?: string,
): Promise<OccupancyMetric> {
  const { from, to } = resolveDateRange(dateRange);

  const where: Record<string, unknown> = {
    organizationId,
    startTime: dateRangeFilter(from, to),
    status: { notIn: ["CANCELLED"] },
  };
  if (professionalUserId) {
    where["professionalId"] = professionalUserId;
  }

  const occupiedSlots = await prisma.booking.count({ where });

  // Calculate number of days in range (inclusive of both endpoints).
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.floor((to.getTime() - from.getTime()) / msPerDay);
  const days = Math.max(daysDiff + 1, 1);
  const totalSlots = maxBookingsPerDay * days;
  const rate = totalSlots > 0 ? occupiedSlots / totalSlots : 0;

  return { occupiedSlots, totalSlots, rate };
}

// ---------------------------------------------------------------------------
// getPatientMetrics — New vs returning patients (AND-003, AND-005)
// ---------------------------------------------------------------------------

/**
 * Distinguishes new vs returning patients based on booking history.
 * New: first booking ever is within the date range.
 * Returning: had bookings before the date range.
 */
export async function getPatientMetrics(
  organizationId: string,
  dateRange: DateRange,
  professionalUserId?: string,
): Promise<PatientMetric> {
  const { from, to } = resolveDateRange(dateRange);

  const where: Record<string, unknown> = {
    organizationId,
    startTime: dateRangeFilter(from, to),
    patientId: { not: null },
  };
  if (professionalUserId) {
    where["professionalId"] = professionalUserId;
  }

  // Get unique patientIds in the date range.
  const bookings = await prisma.booking.findMany({
    where,
    select: { patientId: true },
    distinct: ["patientId"],
  });

  const patientIds = bookings
    .map((b) => b.patientId)
    .filter((id): id is string => id !== null);

  if (patientIds.length === 0) {
    return { newPatients: 0, returningPatients: 0, totalUnique: 0 };
  }

  // For each patient, check if they had a booking before the range.
  let newPatients = 0;
  let returningPatients = 0;

  for (const patientId of patientIds) {
    const earlierBooking = await prisma.booking.findFirst({
      where: {
        organizationId,
        patientId,
        startTime: { lt: from },
      },
      select: { id: true },
    });

    if (earlierBooking) {
      returningPatients++;
    } else {
      newPatients++;
    }
  }

  return {
    newPatients,
    returningPatients,
    totalUnique: patientIds.length,
  };
}

// ---------------------------------------------------------------------------
// getTopServices — Service ranking (AND-003, AND-005)
// ---------------------------------------------------------------------------

/**
 * Ranks services by booking count within a date range.
 * Uses groupBy on serviceId with _count and joined service data.
 */
export async function getTopServices(
  organizationId: string,
  dateRange: DateRange,
  professionalUserId?: string,
): Promise<ServiceMetric[]> {
  const { from, to } = resolveDateRange(dateRange);

  const where: Record<string, unknown> = {
    organizationId,
    startTime: dateRangeFilter(from, to),
  };
  if (professionalUserId) {
    where["professionalId"] = professionalUserId;
  }

  const rows = await prisma.booking.groupBy({
    by: ["serviceId"],
    where,
    _count: { _all: true },
    orderBy: { _count: { serviceId: "desc" } },
  });

  if (rows.length === 0) {
    return [];
  }

  // Fetch service details for the grouped serviceIds.
  const serviceIds = rows.map((r) => r.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true, price: true },
  });
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  // Fetch revenue per service from approved payments.
  // Prisma does not support groupBy on relation paths (e.g. "booking.serviceId"),
  // so we query payments with booking data and aggregate in memory.
  const paymentRows = await prisma.payment.findMany({
    where: {
      organizationId,
      status: APPROVED_PAYMENT_STATUS,
      booking: {
        ...where,
        serviceId: { in: serviceIds },
      },
    },
    select: {
      amount: true,
      booking: { select: { serviceId: true } },
    },
  });
  const revenueMap = new Map<string, number>();
  for (const payment of paymentRows) {
    const sid = payment.booking.serviceId;
    revenueMap.set(sid, (revenueMap.get(sid) ?? 0) + payment.amount);
  }

  return rows.map((row) => {
    const service = serviceMap.get(row.serviceId);
    return {
      serviceId: row.serviceId,
      serviceName: service?.name ?? "Unknown",
      count: row._count._all,
      revenue: revenueMap.get(row.serviceId) ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// getTopProfessionals — Professional ranking (AND-003, AND-005)
// ---------------------------------------------------------------------------

/**
 * Ranks professionals by booking count within a date range.
 * Uses groupBy on professionalId with _count and joined professional data.
 */
export async function getTopProfessionals(
  organizationId: string,
  dateRange: DateRange,
  professionalUserId?: string,
): Promise<ProfessionalMetric[]> {
  const { from, to } = resolveDateRange(dateRange);

  const where: Record<string, unknown> = {
    organizationId,
    startTime: dateRangeFilter(from, to),
  };
  if (professionalUserId) {
    where["professionalId"] = professionalUserId;
  }

  const rows = await prisma.booking.groupBy({
    by: ["professionalId"],
    where,
    _count: { _all: true },
    orderBy: { _count: { professionalId: "desc" } },
  });

  if (rows.length === 0) {
    return [];
  }

  // Fetch professional user names.
  const profIds = rows.map((r) => r.professionalId);
  const professionals = await prisma.professional.findMany({
    where: { id: { in: profIds } },
    select: { id: true, user: { select: { name: true } } },
  });
  const profMap = new Map(professionals.map((p) => [p.id, p.user.name]));

  // Fetch revenue per professional from approved payments.
  // Prisma does not support groupBy on relation paths (e.g. "booking.professionalId"),
  // so we query payments with booking data and aggregate in memory.
  const paymentRows = await prisma.payment.findMany({
    where: {
      organizationId,
      status: APPROVED_PAYMENT_STATUS,
      booking: {
        ...where,
        professionalId: { in: profIds },
      },
    },
    select: {
      amount: true,
      booking: { select: { professionalId: true } },
    },
  });
  const revenueMap = new Map<string, number>();
  for (const payment of paymentRows) {
    const pid = payment.booking.professionalId;
    revenueMap.set(pid, (revenueMap.get(pid) ?? 0) + payment.amount);
  }

  return rows.map((row) => ({
    professionalUserId: row.professionalId,
    name: profMap.get(row.professionalId) ?? "Unknown",
    count: row._count._all,
    revenue: revenueMap.get(row.professionalId) ?? 0,
    occupancyRate: 0, // Computed at action layer with settings data.
  }));
}

// ---------------------------------------------------------------------------
// getPeakHours + getDayDistribution — Temporal aggregation (AND-003, AND-005)
// ---------------------------------------------------------------------------

/**
 * Groups bookings by hour of day (0–23).
 * Uses findMany + pure helper because Prisma groupBy does not support
 * computed fields (EXTRACT(HOUR FROM startTime)).
 */
export async function getPeakHours(
  organizationId: string,
  dateRange: DateRange,
  professionalUserId?: string,
): Promise<PeakHourMetric[]> {
  const { from, to } = resolveDateRange(dateRange);

  const where: Record<string, unknown> = {
    organizationId,
    startTime: dateRangeFilter(from, to),
  };
  if (professionalUserId) {
    where["professionalId"] = professionalUserId;
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: { startTime: true },
  });

  if (bookings.length === 0) {
    return [];
  }

  const hourMap = new Map<number, number>();
  for (const booking of bookings) {
    const hour = booking.startTime.getUTCHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }

  return Array.from(hourMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([hour, count]) => ({ hour, count }));
}

/**
 * Groups bookings by day of week (0=Sunday, 6=Saturday).
 * Uses findMany + pure helper because Prisma groupBy does not support
 * computed fields (EXTRACT(DOW FROM startTime)).
 */
export async function getDayDistribution(
  organizationId: string,
  dateRange: DateRange,
  professionalUserId?: string,
): Promise<DayDistributionMetric[]> {
  const { from, to } = resolveDateRange(dateRange);

  const where: Record<string, unknown> = {
    organizationId,
    startTime: dateRangeFilter(from, to),
  };
  if (professionalUserId) {
    where["professionalId"] = professionalUserId;
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: { startTime: true },
  });

  if (bookings.length === 0) {
    return [];
  }

  const dayMap = new Map<number, number>();
  for (const booking of bookings) {
    const dayOfWeek = booking.startTime.getUTCDay();
    dayMap.set(dayOfWeek, (dayMap.get(dayOfWeek) ?? 0) + 1);
  }

  return Array.from(dayMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([dayOfWeek, count]) => ({ dayOfWeek, count }));
}
