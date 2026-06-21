/**
 * Dashboard data provider.
 *
 * Server-only data access for the dashboard module. Every function takes
 * an `organizationId` so the queries are tenant-scoped — the dashboard
 * must NEVER see data from a different organization.
 *
 * Conventions:
 * - Pure data layer: no React, no Next.js, no auth wiring here.
 * - The caller is responsible for resolving the current `organizationId`
 *   (see `get-organization-id.ts`).
 * - All time-bucketing uses the server's local clock; future work may
 *   pin this to an explicit timezone.
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DashboardMetrics {
  todayBookings: number;
  weekBookings: number;
  monthRevenue: number;
  cancellations: number;
  newPatients: number;
  occupancyRate: number;
}

export type ActivityType = "booking" | "payment" | "patient";

export interface RecentActivity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: Date;
}

export interface TopService {
  name: string;
  count: number;
  revenue: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
}

export interface BookingsByDay {
  date: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Date helpers — kept local to avoid leaking abstractions.
// ---------------------------------------------------------------------------

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function daysAgoStart(days: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - days);
  return d;
}

function startOfThisMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthKey(date: Date): string {
  // YYYY-MM (UTC for stable grouping).
  return date.toISOString().slice(0, 7);
}

function dateKey(date: Date): string {
  // YYYY-MM-DD.
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// getDashboardMetrics
// ---------------------------------------------------------------------------

const SLOTS_PER_PROFESSIONAL_PER_DAY = 8;

export async function getDashboardMetrics(
  organizationId: string,
): Promise<DashboardMetrics> {
  const today = startOfToday();
  const tomorrow = endOfToday();
  const weekAgo = daysAgoStart(7);
  const monthStart = startOfThisMonth();

  const [
    todayBookings,
    weekBookings,
    monthRevenueAgg,
    cancellations,
    newPatients,
    weekOccupiedSlots,
    activeProfessionals,
  ] = await Promise.all([
    prisma.booking.count({
      where: { organizationId, startTime: { gte: today, lt: tomorrow } },
    }),
    prisma.booking.count({
      where: { organizationId, startTime: { gte: weekAgo } },
    }),
    prisma.payment.aggregate({
      where: {
        organizationId,
        status: "APPROVED",
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: {
        organizationId,
        status: "CANCELLED",
        startTime: { gte: weekAgo },
      },
    }),
    prisma.patient.count({
      where: { organizationId, createdAt: { gte: weekAgo } },
    }),
    prisma.booking.count({
      where: { organizationId, startTime: { gte: weekAgo } },
    }),
    prisma.professional.count({
      where: { organizationId, status: "ACTIVE" },
    }),
  ]);

  const monthRevenue = monthRevenueAgg._sum.amount ?? 0;

  // Crude occupancy: occupied bookings / (active professionals * 7 days * 8 slots)
  const capacity = activeProfessionals * 7 * SLOTS_PER_PROFESSIONAL_PER_DAY;
  const occupancyRate =
    capacity > 0
      ? Math.min(100, Math.round((weekOccupiedSlots / capacity) * 100))
      : 0;

  return {
    todayBookings,
    weekBookings,
    monthRevenue,
    cancellations,
    newPatients,
    occupancyRate,
  };
}

// ---------------------------------------------------------------------------
// getTodayBookings
// ---------------------------------------------------------------------------

export async function getTodayBookings(organizationId: string) {
  const today = startOfToday();
  const tomorrow = endOfToday();

  return prisma.booking.findMany({
    where: { organizationId, startTime: { gte: today, lt: tomorrow } },
    include: {
      patient: { include: { user: { select: { name: true, email: true } } } },
      professional: { include: { user: { select: { name: true } } } },
      service: { select: { name: true } },
    },
    orderBy: { startTime: "asc" },
    take: 10,
  });
}

// ---------------------------------------------------------------------------
// getRecentActivity
// ---------------------------------------------------------------------------

const RECENT_ACTIVITY_LIMIT = 10;

export async function getRecentActivity(
  organizationId: string,
): Promise<RecentActivity[]> {
  const [recentBookings, recentPayments, recentPatients] = await Promise.all([
    prisma.booking.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        service: { select: { name: true } },
        patient: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.payment.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.patient.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const activity: RecentActivity[] = [
    ...recentBookings.map((b) => ({
      id: b.id,
      type: "booking" as const,
      description: `Reserva de ${b.patient ? b.patient.user.name : "Invitado"} — ${b.service.name}`,
      timestamp: b.createdAt,
    })),
    ...recentPayments.map((p) => ({
      id: p.id,
      type: "payment" as const,
      description: `Pago ${p.status.toLowerCase()} — $${p.amount.toLocaleString("es-AR")}`,
      timestamp: p.createdAt,
    })),
    ...recentPatients.map((p) => ({
      id: p.id,
      type: "patient" as const,
      description: `Nuevo paciente: ${p.user.name}`,
      timestamp: p.createdAt,
    })),
  ];

  return activity
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT);
}

// ---------------------------------------------------------------------------
// getTopServices
// ---------------------------------------------------------------------------

const TOP_SERVICES_LIMIT = 5;

export async function getTopServices(
  organizationId: string,
): Promise<TopService[]> {
  const bookings = await prisma.booking.findMany({
    where: { organizationId },
    include: { service: { select: { name: true } } },
  });

  const serviceMap = new Map<string, { count: number; revenue: number }>();
  for (const booking of bookings) {
    const current = serviceMap.get(booking.service.name) ?? {
      count: 0,
      revenue: 0,
    };
    serviceMap.set(booking.service.name, {
      count: current.count + 1,
      revenue: current.revenue,
    });
  }

  return Array.from(serviceMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_SERVICES_LIMIT);
}

// ---------------------------------------------------------------------------
// getRevenueByMonth (last 6 months, zero-filled)
// ---------------------------------------------------------------------------

const REVENUE_MONTHS = 6;

export async function getRevenueByMonth(
  organizationId: string,
): Promise<RevenueByMonth[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - REVENUE_MONTHS);
  cutoff.setDate(1);
  cutoff.setHours(0, 0, 0, 0);

  const payments = await prisma.payment.findMany({
    where: {
      organizationId,
      status: "APPROVED",
      createdAt: { gte: cutoff },
    },
    select: { amount: true, createdAt: true },
  });

  const monthlyRevenue = new Map<string, number>();
  for (const payment of payments) {
    const key = monthKey(payment.createdAt);
    monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + payment.amount);
  }

  const result: RevenueByMonth[] = [];
  for (let i = REVENUE_MONTHS - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    const key = monthKey(d);
    result.push({ month: key, revenue: monthlyRevenue.get(key) ?? 0 });
  }

  return result;
}

// ---------------------------------------------------------------------------
// getBookingsByDay (last 7 days, zero-filled)
// ---------------------------------------------------------------------------

const BOOKINGS_DAYS = 7;

export async function getBookingsByDay(
  organizationId: string,
): Promise<BookingsByDay[]> {
  const cutoff = daysAgoStart(BOOKINGS_DAYS);

  const bookings = await prisma.booking.findMany({
    where: { organizationId, createdAt: { gte: cutoff } },
    select: { createdAt: true },
  });

  const dailyCounts = new Map<string, number>();
  for (const booking of bookings) {
    const key = dateKey(booking.createdAt);
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  }

  const result: BookingsByDay[] = [];
  for (let i = BOOKINGS_DAYS - 1; i >= 0; i--) {
    const d = daysAgoStart(i);
    const key = dateKey(d);
    result.push({ date: key, count: dailyCounts.get(key) ?? 0 });
  }

  return result;
}
