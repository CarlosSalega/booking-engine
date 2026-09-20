import { prisma } from "@/lib/prisma";

import {
  hasOverlappingWeeklyScheduleIntervals,
  weeklyScheduleIntervalSchema,
  type WeeklyScheduleInterval,
} from "../domain";

export class ScheduleValidationError extends Error {
  constructor(message = "Invalid professional schedule") {
    super(message);
    this.name = "ScheduleValidationError";
  }
}

export async function getProfessionalSchedule(
  organizationId: string,
  professionalId: string,
): Promise<WeeklyScheduleInterval[]> {
  const intervals = await prisma.professionalScheduleInterval.findMany({
    where: { organizationId, professionalId },
    select: { dayOfWeek: true, startMinute: true, endMinute: true },
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
  });

  return intervals;
}

export async function replaceProfessionalSchedule(
  organizationId: string,
  professionalId: string,
  intervals: readonly WeeklyScheduleInterval[],
): Promise<WeeklyScheduleInterval[]> {
  const parsed = intervals.map((interval) =>
    weeklyScheduleIntervalSchema.safeParse(interval),
  );
  const invalid = parsed.find((result) => !result.success);

  if (invalid && !invalid.success) {
    throw new ScheduleValidationError(invalid.error.issues[0]?.message);
  }

  const normalized = parsed.map((result) => {
    if (!result.success) {
      throw new ScheduleValidationError();
    }
    return result.data;
  });

  if (hasOverlappingWeeklyScheduleIntervals(normalized)) {
    throw new ScheduleValidationError("Schedule intervals cannot overlap");
  }

  return prisma.$transaction(async (tx) => {
    const professional = await tx.professional.findFirst({
      where: { id: professionalId, organizationId },
      select: { id: true },
    });

    if (!professional) {
      throw new ScheduleValidationError("Professional not found");
    }

    await tx.professionalScheduleInterval.deleteMany({
      where: { professionalId, organizationId },
    });

    if (normalized.length > 0) {
      await tx.professionalScheduleInterval.createMany({
        data: normalized.map((interval) => ({
          organizationId,
          professionalId,
          ...interval,
        })),
      });
    }

    return normalized;
  });
}
