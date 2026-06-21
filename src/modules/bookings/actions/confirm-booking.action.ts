"use server";

/**
 * confirmBooking Server Action.
 *
 * State transition: PENDING | AWAITING_PAYMENT → CONFIRMED.
 *
 * Optimistic locking: the Prisma `update` uses
 * `where: { id: bookingId, updatedAt: currentUpdatedAt }` so concurrent
 * edits surface as a P2025 error (the row was modified by someone else
 * between the fetch and the update). The catch block translates P2025
 * into a user-facing Spanish error.
 *
 * RBAC:
 * - ADMIN / SECRETARY can confirm any booking.
 * - PROFESSIONAL can only confirm their own bookings.
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

import { confirmBookingSchema } from "./booking-actions.schema";
import type { BookingResult, ConfirmBookingInput } from "./booking-actions.types";

export async function confirmBooking(
  input: ConfirmBookingInput,
): Promise<BookingResult> {
  // 1. Zod 4 validation
  const parsed = confirmBookingSchema.safeParse(input);
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

  // 3. Load the booking (scoped to the org) to read its current status
  //    and to enforce the PROFESSIONAL ownership check.
  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, organizationId },
    include: {
      professional: { select: { id: true, userId: true } },
    },
  });
  if (!booking) {
    return { success: false, error: "Turno no encontrado" };
  }

  // 4. RBAC: PROFESSIONAL can only confirm their own bookings
  if (role === USER_ROLE.PROFESSIONAL) {
    if (booking.professional.userId !== userId) {
      return { success: false, error: "No autorizado" };
    }
  }

  // 5. State machine: PENDING / AWAITING_PAYMENT → CONFIRMED
  if (!canTransition(booking.status as BookingStatusType, BookingStatus.CONFIRMED)) {
    return {
      success: false,
      error: `No es una transición válida: ${booking.status} → CONFIRMED`,
    };
  }

  // 6. Optimistic update: WHERE includes updatedAt
  try {
    await prisma.booking.update({
      where: { id: booking.id, updatedAt: booking.updatedAt },
      data: { status: BookingStatus.CONFIRMED },
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

  // 7. Revalidate the bookings list page
  revalidatePath("/dashboard/bookings");

  return { success: true };
}
