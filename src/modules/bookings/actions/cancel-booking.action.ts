"use server";

/**
 * cancelBooking Server Action.
 *
 * State transition: PENDING | CONFIRMED | AWAITING_PAYMENT → CANCELLED.
 * Terminal states (COMPLETED, NO_SHOW, RESCHEDULED, CANCELLED) cannot
 * be cancelled.
 *
 * The reason (optional) is appended to the booking's `notes` field for
 * audit, prefixed with "Cancelado: " so the UI can recognize and render
 * the cancellation reason as structured text.
 *
 * Optimistic locking: same as `confirmBooking` — the WHERE clause
 * includes `updatedAt`, and P2025 surfaces as a user-facing error.
 *
 * RBAC:
 * - ADMIN / SECRETARY can cancel any booking.
 * - PROFESSIONAL can only cancel their own bookings.
 * - PATIENT is blocked at the layout.
 *
 * Returns `{ success: true }` (no data) on success.
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
  canTransition,
} from "@/modules/bookings/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";

import { cancelBookingSchema } from "./booking-actions.schema";
import type { BookingResult, CancelBookingInput } from "./booking-actions.types";

export async function cancelBooking(
  input: CancelBookingInput,
): Promise<BookingResult> {
  // 1. Zod 4 validation
  const parsed = cancelBookingSchema.safeParse(input);
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

  // 3. Load the booking (scoped to the org)
  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, organizationId },
    include: {
      professional: { select: { id: true, userId: true } },
    },
  });
  if (!booking) {
    return { success: false, error: "Turno no encontrado" };
  }

  // 4. RBAC: PROFESSIONAL can only cancel their own bookings
  if (role === USER_ROLE.PROFESSIONAL) {
    if (booking.professional.userId !== userId) {
      return { success: false, error: "No autorizado" };
    }
  }

  // 5. State machine: only non-terminal states can be cancelled
  if (!canTransition(booking.status as BookingStatusType, BookingStatus.CANCELLED)) {
    return {
      success: false,
      error: `No es una transición válida: ${booking.status} → CANCELLED`,
    };
  }

  // 6. Compose the updated notes (append the reason when present)
  const reason = parsed.data.reason?.trim();
  const updatedNotes = reason
    ? booking.notes
      ? `${booking.notes}\nCancelado: ${reason}`
      : `Cancelado: ${reason}`
    : booking.notes;

  // 7. Optimistic update
  try {
    await prisma.booking.update({
      where: { id: booking.id, updatedAt: booking.updatedAt },
      data: { status: BookingStatus.CANCELLED, notes: updatedNotes },
    });
  } catch (error) {
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

  return { success: true };
}
