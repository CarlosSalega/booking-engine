/**
 * Bookings availability data provider.
 *
 * Two read-only functions for the wizard UI and the booking form:
 *   - `checkAvailability` — is this exact [start, end) range free?
 *   - `getAvailableSlots` — what slots are open for a given day?
 *
 * Conventions:
 * - Pure data layer: no React, no Next.js, no auth wiring here.
 * - The caller resolves `organizationId` and any RBAC scoping.
 * - `checkAvailability` is NOT atomic — the create/reschedule
 *   `prisma.$transaction` is the final arbiter. This function is
 *   a good-faith preview for the wizard.
 * - Configured weekly intervals drive the slot grid; empty schedules use the
 *   explicit legacy fallback of 08:00–20:00 every day.
 * - CANCELLED and NO_SHOW bookings are excluded from overlap checks.
 */

import { prisma } from "@/lib/prisma";

import {
  calculateAvailableSlots,
  DEFAULT_WEEKLY_SCHEDULE,
} from "@/modules/availability";
import { getProfessionalSchedule } from "@/modules/schedules/data/schedule-data";
import type { TimeSlot } from "../domain/time-slot";
import type { AvailableSlot } from "./booking-data.types";

// ---------------------------------------------------------------------------
// checkAvailability
// ---------------------------------------------------------------------------

/**
 * Returns `true` when no active booking overlaps with the given range
 * for the given professional. `false` when the range is occupied.
 *
 * @param organizationId Tenant scope.
 * @param professionalId Professional whose calendar is being checked.
 * @param startTime Range start (inclusive).
 * @param endTime Range end (exclusive).
 * @param excludeBookingId When set, ignores the booking with this id
 *   (used during reschedule to allow the same booking's own slot).
 */
export async function checkAvailability(
  organizationId: string,
  professionalId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
): Promise<boolean> {
  const overlap = await prisma.booking.findFirst({
    where: {
      organizationId,
      professionalId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
  });
  return overlap === null;
}

// ---------------------------------------------------------------------------
// getAvailableSlots
// ---------------------------------------------------------------------------

/**
 * List open 30-min slots for the given date and service. The function:
 *   1. Reads the service's `durationMinutes`.
 *   2. Queries active bookings for the professional on that date.
 *   3. Generates the 30-min grid inside the configured intervals.
 *   4. Filters out slots that overlap with any active booking.
 *
 * @param organizationId Tenant scope.
 * @param professionalId Professional whose calendar is being checked.
 * @param serviceId Service whose duration determines slot length.
 * @param date Calendar day (local time). Only the YYYY-MM-DD part is used.
 * @returns Open slots in chronological order. Empty when the service
 *   does not exist.
 */
export async function getAvailableSlots(
  organizationId: string,
  professionalId: string,
  serviceId: string,
  date: Date,
): Promise<AvailableSlot[]> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { durationMinutes: true },
  });

  if (!service) {
    return [];
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      organizationId,
      professionalId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    select: { startTime: true, endTime: true },
  });

  const occupied = bookings.map(
    (b): TimeSlot => ({ startTime: b.startTime, endTime: b.endTime }),
  );

  const configuredSchedule = await getProfessionalSchedule(
    organizationId,
    professionalId,
  );
  const schedule = configuredSchedule.length
    ? configuredSchedule
    : DEFAULT_WEEKLY_SCHEDULE;
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId },
    select: { bufferMinutes: true },
  });

  return calculateAvailableSlots(schedule, date, service.durationMinutes, occupied, {
    bufferMinutes: settings?.bufferMinutes ?? 0,
  });
}
