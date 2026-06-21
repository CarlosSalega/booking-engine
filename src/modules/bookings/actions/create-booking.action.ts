"use server";

/**
 * createBooking Server Action.
 *
 * Creates a new booking for a given professional and service. Validates
 * input with the Zod 4 schema, enforces RBAC, then performs an atomic
 * overlap check + insert inside a Prisma transaction.
 *
 * RBAC:
 * - ADMIN / SECRETARY can create bookings for any professional.
 * - PROFESSIONAL can only create bookings for themselves.
 * - PATIENT cannot reach this action (gated by the dashboard layout).
 *
 * Guest mode: when `patientId` is absent, the action stores the guest
 * contact info in the `notes` field as a structured string
 * (`"Invitado: <name> | Tel: <phone> | Email: <email>"`). This is a
 * pragmatic MVP decision — a future migration will add dedicated
 * guest columns to the Booking model.
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message
 * - No session → "No autenticado"
 * - PROFESSIONAL foreign-id → "No autorizado"
 * - Service missing / not ACTIVE → "El servicio no está disponible"
 * - Overlap detected inside the transaction → "El horario está ocupado"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@/modules/auth/domain";
import { BookingStatus, calculateEndTime } from "@/modules/bookings/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";

import { createBookingSchema } from "./booking-actions.schema";
import type { BookingResult, CreateBookingInput } from "./booking-actions.types";

export async function createBooking(
  input: CreateBookingInput,
): Promise<BookingResult<{ id: string; status: string; startTime: Date; endTime: Date }>> {
  // 1. Zod 4 validation
  const parsed = createBookingSchema.safeParse(input);
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

  // 3. RBAC: PROFESSIONAL can only create for themselves
  if (role === USER_ROLE.PROFESSIONAL) {
    const professional = await prisma.professional.findFirst({
      where: { userId, organizationId },
    });
    if (!professional || professional.id !== parsed.data.professionalId) {
      return { success: false, error: "No autorizado" };
    }
  }

  // 4. Service lookup — verifies the service exists and is ACTIVE
  const service = await prisma.service.findUnique({
    where: { id: parsed.data.serviceId },
    select: { id: true, status: true, durationMinutes: true },
  });
  if (!service || service.status !== "ACTIVE") {
    return { success: false, error: "El servicio no está disponible" };
  }

  // 5. Build the notes payload (guest info goes into `notes` for now)
  const { notes, endTime } = buildCreatePayload(parsed.data, service.durationMinutes);

  // 6. Atomic: overlap check + insert in a single transaction
  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const overlap = await tx.booking.findFirst({
        where: {
          organizationId,
          professionalId: parsed.data.professionalId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          startTime: { lt: endTime },
          endTime: { gt: parsed.data.startTime },
        },
      });
      if (overlap) {
        // Throw to abort the transaction; the catch block below translates
        // this into the user-facing "occupied" error.
        throw new OverlapError();
      }
      return tx.booking.create({
        data: {
          organizationId,
          patientId: parsed.data.patientId ?? null,
          professionalId: parsed.data.professionalId,
          serviceId: parsed.data.serviceId,
          startTime: parsed.data.startTime,
          endTime,
          status: BookingStatus.PENDING,
          notes,
        },
      });
    });
  } catch (error) {
    if (error instanceof OverlapError) {
      return { success: false, error: "El horario está ocupado" };
    }
    throw error;
  }

  // 7. Revalidate the bookings list page
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

/** Sentinel error used to abort the create transaction on overlap. */
class OverlapError extends Error {
  constructor() {
    super("Slot overlap detected");
    this.name = "OverlapError";
  }
}

/**
 * Compute the booking's endTime and the final notes payload.
 *
 * End-time is `startTime + service.durationMinutes`. Notes combine the
 * user-supplied notes (if any) with a structured guest info line when
 * the booking has no patient. For patient bookings the original notes
 * pass through unchanged.
 */
function buildCreatePayload(
  data: {
    startTime: Date;
    notes?: string;
    patientId?: string;
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
  },
  durationMinutes: number,
): { endTime: Date; notes: string | null } {
  const endTime = calculateEndTime(data.startTime, durationMinutes);

  let notes: string | null = data.notes ?? null;

  if (!data.patientId) {
    const guestLine = [
      data.guestName ? `Invitado: ${data.guestName}` : null,
      data.guestPhone ? `Tel: ${data.guestPhone}` : null,
      data.guestEmail ? `Email: ${data.guestEmail}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    if (guestLine) {
      notes = notes ? `${notes}\n${guestLine}` : guestLine;
    }
  }

  return { endTime, notes };
}
