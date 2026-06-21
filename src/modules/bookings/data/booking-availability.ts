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
 * - Slot grid: 30-min increments, 08:00–20:00 local time.
 * - CANCELLED and NO_SHOW bookings are excluded from overlap checks.
 */

import { prisma } from "@/lib/prisma";

import { isOverlapping, type TimeSlot } from "../domain/time-slot";

// ---------------------------------------------------------------------------
// Constants — single source of truth for the slot grid.
// ---------------------------------------------------------------------------

/** Business hours: earliest slot start. */
const DAY_START_HOUR = 8;
/** Business hours: latest slot start (slots may end after this). */
const DAY_END_HOUR = 20;
/** Grid step in minutes. */
const SLOT_STEP_MINUTES = 30;

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

/** A time slot presented to the wizard UI. */
export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
}

/**
 * List open 30-min slots for the given date and service. The function:
 *   1. Reads the service's `durationMinutes`.
 *   2. Queries active bookings for the professional on that date.
 *   3. Generates the 30-min grid from 08:00 to 20:00 (24 slots).
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
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  const occupied = bookings.map(
    (b): TimeSlot => ({ startTime: b.startTime, endTime: b.endTime }),
  );

  const slots: AvailableSlot[] = [];
  const cursor = new Date(date);
  cursor.setHours(DAY_START_HOUR, 0, 0, 0);
  const cutoff = new Date(date);
  cutoff.setHours(DAY_END_HOUR, 0, 0, 0);

  while (cursor < cutoff) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor.getTime() + service.durationMinutes * 60_000);

    const slot: TimeSlot = { startTime: slotStart, endTime: slotEnd };
    const isOccupied = occupied.some((o) => isOverlapping(slot, o));

    if (!isOccupied) {
      slots.push({ startTime: slotStart, endTime: slotEnd });
    }

    cursor.setMinutes(cursor.getMinutes() + SLOT_STEP_MINUTES);
  }

  return slots;
}
