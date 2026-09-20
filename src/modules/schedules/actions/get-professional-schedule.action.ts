"use server";

import { headers } from "next/headers";

import { auth } from "@/core/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getProfessionalSchedule } from "../data/schedule-data";

import { getProfessionalScheduleSchema } from "./schedule-actions.schema";
import type {
  GetProfessionalScheduleInput,
  ScheduleResult,
} from "./schedule-actions.types";

export async function getSchedule(
  input: GetProfessionalScheduleInput,
): Promise<ScheduleResult<Awaited<ReturnType<typeof getProfessionalSchedule>>>> {
  const parsed = getProfessionalScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role === USER_ROLE.PATIENT) {
    return { success: false, error: "No autorizado" };
  }

  const organizationId = await getOrganizationId();
  const professionalId = parsed.data.professionalId;
  if (session.user.role === USER_ROLE.PROFESSIONAL) {
    const own = await prisma.professional.findFirst({
      where: { organizationId, userId: session.user.id },
      select: { id: true },
    });
    if (!own || own.id !== professionalId) {
      return { success: false, error: "No autorizado" };
    }
  }

  return { success: true, data: await getProfessionalSchedule(organizationId, professionalId) };
}
