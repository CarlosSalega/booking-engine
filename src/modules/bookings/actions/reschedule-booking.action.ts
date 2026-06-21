"use server";

/**
 * rescheduleBooking Server Action.
 *
 * State transition: CONFIRMED → RESCHEDULED (terminal) for the OLD
 * booking, and a NEW PENDING booking is created with the requested
 * start time. The new booking's end time is computed from the service
 * duration loaded with the old booking.
 *
 * Atomicity: the overlap check (excluding the current booking) and the
 * status update + new insert run inside a single Prisma transaction
 * (`$transaction(async (tx) => ...)`), so two concurrent reschedules
 * for the same target slot can never both succeed.
 *
 * Optimistic locking: the `update` on the old booking uses
 * `where: { id, updatedAt }`; a P2025 from Prisma surfaces as a
 * user-facing "Modified by another user" error.
 *
 * RBAC:
 * - ADMIN / SECRETARY can reschedule any booking.
 * - PROFESSIONAL can only reschedule their own bookings.
 * - PATIENT is blocked at the layout.
 *
 * State machine: only CONFIRMED → RESCHEDULED is valid
 * (PENDING|AWAITING_PAYMENT cannot go to RESCHEDULED — they must be
 * CONFIRMED first). The action returns a Spanish error for any
 * non-reschedulable state.
 *
 * Returns `BookingResult<{ id; status; startTime; endTime }>` (the
 * new booking) on success.
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { USER_ROLE } from "@/modules/auth/domain";
import {
  BookingStatus,
  type BookingStatusType,
  calculateEndTime,
  canTransition,
} from "@/modules/bookings/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";

import { rescheduleBookingSchema } from "./booking-actions.schema";
import type {
  BookingResult,
  RescheduleBookingInput,
} from "./booking-actions.types";

/** Result payload for the reschedule action — the newly created booking. */
export interface RescheduleResult {
  id: string;
  status: string;
  startTime: Date;
  endTime: Date;
}

export async function rescheduleBooking(
  input: RescheduleBookingInput,
): Promise<BookingResult<RescheduleResult>> {
  // 1. Zod 4 validation
  const parsed = rescheduleBookingSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  // 2. Auth: get session + organization
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autenticado" };
  }

  const role = session.user.role;
  const userId = session.user.id;
  const organizationId = await getOrganizationId();

  // 3. Load the booking (scoped to the org) with its service duration
  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, organizationId },
    include: {
      professional: { select: { id: true, userId: true } },
      service: { select: { durationMinutes: true } },
    },
  });
  if (!booking) {
    return { success: false, error: "Turno no encontrado" };
  }

  // 4. RBAC: PROFESSIONAL can only reschedule their own bookings
  if (role === USER_ROLE.PROFESSIONAL) {
    if (booking.professional.userId !== userId) {
      return { success: false, error: "No autorizado" };
    }
  }

  // 5. State machine: only CONFIRMED can go to RESCHEDULED
  if (!canTransition(booking.status as BookingStatusType, BookingStatus.RESCHEDULED)) {
    return {
      success: false,
      error: `No es una transición válida: ${booking.status} → RESCHEDULED`,
    };
  }

  // 6. Compute the new endTime from the service duration
  const newStartTime = parsed.data.newStartTime;
  const newEndTime = calculateEndTime(newStartTime, booking.service.durationMinutes);

  // 7. Atomic: overlap check (excluding self) + status update + new insert
  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      // 7a. Overlap check for the new slot — exclude the booking being
      //     rescheduled so its own row doesn't appear as a conflict.
      const overlap = await tx.booking.findFirst({
        where: {
          organizationId,
          professionalId: booking.professionalId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          startTime: { lt: newEndTime },
          endTime: { gt: newStartTime },
          id: { not: booking.id },
        },
      });
      if (overlap) {
        throw new RescheduleOverlapError();
      }

      // 7b. Mark the old booking as RESCHEDULED (with optimistic lock)
      await tx.booking.update({
        where: { id: booking.id, updatedAt: booking.updatedAt },
        data: { status: BookingStatus.RESCHEDULED },
      });

      // 7c. Create the new booking as PENDING, same patient/professional/service
      return tx.booking.create({
        data: {
          organizationId,
          patientId: booking.patientId,
          professionalId: booking.professionalId,
          serviceId: booking.serviceId,
          startTime: newStartTime,
          endTime: newEndTime,
          status: BookingStatus.PENDING,
          notes: booking.notes,
        },
      });
    });
  } catch (error) {
    if (error instanceof RescheduleOverlapError) {
      return { success: false, error: "El horario deseado está ocupado" };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return {
        success: false,
        error: "El turno fue modificado por otro usuario. Recargá la página.",
      };
    }
    throw error;
  }

  // 8. Revalidate the bookings list page
  revalidatePath("/dashboard/bookings");

  return {
    success: true,
    data: {
      id: created.id,
      status: created.status,
      startTime: created.startTime,
      endTime: created.endTime,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sentinel error used to abort the reschedule transaction on overlap. */
class RescheduleOverlapError extends Error {
  constructor() {
    super("Reschedule slot overlap detected");
    this.name = "RescheduleOverlapError";
  }
}
