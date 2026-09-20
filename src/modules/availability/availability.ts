import { isOverlapping, type TimeSlot } from "@/modules/bookings/domain/time-slot";
import type { AvailableSlot } from "@/modules/bookings/data/booking-data.types";
import type { WeeklyScheduleInterval } from "@/modules/schedules/domain";

export const DEFAULT_WEEKLY_SCHEDULE: readonly WeeklyScheduleInterval[] = [
  { dayOfWeek: 0, startMinute: 8 * 60, endMinute: 20 * 60 },
  { dayOfWeek: 1, startMinute: 8 * 60, endMinute: 20 * 60 },
  { dayOfWeek: 2, startMinute: 8 * 60, endMinute: 20 * 60 },
  { dayOfWeek: 3, startMinute: 8 * 60, endMinute: 20 * 60 },
  { dayOfWeek: 4, startMinute: 8 * 60, endMinute: 20 * 60 },
  { dayOfWeek: 5, startMinute: 8 * 60, endMinute: 20 * 60 },
  { dayOfWeek: 6, startMinute: 8 * 60, endMinute: 20 * 60 },
];

export interface AvailabilityRules {
  slotStepMinutes?: number;
  bufferMinutes?: number;
}

function atMinute(date: Date, minute: number): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setMinutes(minute);
  return result;
}

export function isSlotWithinSchedule(
  schedule: readonly WeeklyScheduleInterval[],
  startTime: Date,
  endTime: Date,
): boolean {
  const crossesMidnight =
    startTime.getDate() !== endTime.getDate() &&
    endTime.getHours() === 0 &&
    endTime.getMinutes() === 0;
  if (startTime.toDateString() !== endTime.toDateString() && !crossesMidnight) {
    return false;
  }
  const day = startTime.getDay();
  const startMinute = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinute = crossesMidnight
    ? 24 * 60
    : endTime.getHours() * 60 + endTime.getMinutes();
  return schedule.some(
    (interval) =>
      interval.dayOfWeek === day &&
      interval.startMinute <= startMinute &&
      interval.endMinute >= endMinute,
  );
}

export function calculateAvailableSlots(
  schedule: readonly WeeklyScheduleInterval[],
  date: Date,
  durationMinutes: number,
  reservations: readonly TimeSlot[],
  rules: AvailabilityRules = {},
): AvailableSlot[] {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) return [];

  const step = rules.slotStepMinutes ?? 30;
  const buffer = rules.bufferMinutes ?? 0;
  if (!Number.isInteger(step) || step <= 0 || buffer < 0) return [];

  const dayIntervals = schedule.filter((interval) => interval.dayOfWeek === date.getDay());
  const slots: AvailableSlot[] = [];

  for (const interval of dayIntervals) {
    for (let minute = interval.startMinute; minute + durationMinutes <= interval.endMinute; minute += step) {
      const startTime = atMinute(date, minute);
      const endTime = atMinute(date, minute + durationMinutes);
      const occupied = reservations.some((reservation) =>
        isOverlapping(
          { startTime: new Date(startTime.getTime() - buffer * 60_000), endTime: new Date(endTime.getTime() + buffer * 60_000) },
          reservation,
        ),
      );
      if (!occupied) slots.push({ startTime, endTime });
    }
  }

  return slots;
}
