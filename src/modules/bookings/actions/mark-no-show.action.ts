"use server";

/**
 * markNoShow Server Action.
 *
 * State transition: CONFIRMED → NO_SHOW (terminal).
 *
 * Mirrors `completeBooking` exactly: same RBAC, same optimistic lock,
 * same P2025 handling. Used by PROFESSIONAL/SECRETARY/ADMIN to record
 * a patient who never arrived for their confirmed appointment.
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

import { markNoShowSchema } from "./booking-actions.schema";
import type { BookingResult, MarkNoShowInput } from "./booking-actions.types";

export async function markNoShow(
  input: MarkNoShowInput,
): Promise<BookingResult> {
  // 1. Zod 4 validation
  const parsed = markNoShowSchema.safeParse(input);
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

  // 3. Load the booking
  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, organizationId },
    include: {
      professional: { select: { id: true, userId: true } },
    },
  });
  if (!booking) {
    return { success: false, error: "Turno no encontrado" };
  }

  // 4. RBAC: PROFESSIONAL can only mark their own bookings
  if (role === USER_ROLE.PROFESSIONAL) {
    if (booking.professional.userId !== userId) {
      return { success: false, error: "No autorizado" };
    }
  }

  // 5. State machine: only CONFIRMED can go to NO_SHOW
  if (!canTransition(booking.status as BookingStatusType, BookingStatus.NO_SHOW)) {
    return {
      success: false,
      error: `No es una transición válida: ${booking.status} → NO_SHOW`,
    };
  }

  // 6. Optimistic update
  try {
    await prisma.booking.update({
      where: { id: booking.id, updatedAt: booking.updatedAt },
      data: { status: BookingStatus.NO_SHOW },
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

  // 7. Revalidate
  revalidatePath("/dashboard/bookings");

  return { success: true };
}
