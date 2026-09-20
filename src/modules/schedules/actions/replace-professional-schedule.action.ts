"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { prisma } from "@/lib/prisma";
import {
  replaceProfessionalSchedule,
  ScheduleValidationError,
} from "../data/schedule-data";

import { replaceProfessionalScheduleSchema } from "./schedule-actions.schema";
import type {
  ReplaceProfessionalScheduleInput,
  ScheduleResult,
} from "./schedule-actions.types";

export async function updateSchedule(
  input: ReplaceProfessionalScheduleInput,
): Promise<ScheduleResult> {
  const parsed = replaceProfessionalScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (
    !session?.user ||
    (session.user.role !== USER_ROLE.ADMIN &&
      session.user.role !== USER_ROLE.PROFESSIONAL)
  ) {
    return { success: false, error: "No autorizado" };
  }

  const organizationId = await getOrganizationId();
  if (session.user.role === USER_ROLE.PROFESSIONAL) {
    const own = await prisma.professional.findFirst({
      where: { organizationId, userId: session.user.id },
      select: { id: true },
    });
    if (!own || own.id !== parsed.data.professionalId) {
      return { success: false, error: "No autorizado" };
    }
  }

  try {
    await replaceProfessionalSchedule(
      organizationId,
      parsed.data.professionalId,
      parsed.data.intervals,
    );
  } catch (error) {
    if (error instanceof ScheduleValidationError) {
      return {
        success: false,
        error: error.message === "Professional not found" ? "Profesional no encontrado" : error.message,
      };
    }
    throw error;
  }

  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/bookings");
  return { success: true };
}
