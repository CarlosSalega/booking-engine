export const DAY_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export type DayOfWeek = (typeof DAY_OF_WEEK)[keyof typeof DAY_OF_WEEK];

export const MINUTES_PER_DAY = 24 * 60;

export interface WeeklyScheduleInterval {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export function isValidDayOfWeek(dayOfWeek: number): dayOfWeek is DayOfWeek {
  return Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek < 7;
}

export function isValidMinute(minute: number): boolean {
  return Number.isInteger(minute) && minute >= 0 && minute <= MINUTES_PER_DAY;
}

export function isValidWeeklyScheduleInterval(
  interval: WeeklyScheduleInterval,
): boolean {
  return (
    isValidDayOfWeek(interval.dayOfWeek) &&
    isValidMinute(interval.startMinute) &&
    isValidMinute(interval.endMinute) &&
    interval.startMinute < MINUTES_PER_DAY &&
    interval.startMinute < interval.endMinute
  );
}

export function isOverlappingWeeklyScheduleIntervals(
  a: WeeklyScheduleInterval,
  b: WeeklyScheduleInterval,
): boolean {
  return (
    a.dayOfWeek === b.dayOfWeek &&
    a.startMinute < b.endMinute &&
    b.startMinute < a.endMinute
  );
}

export function hasOverlappingWeeklyScheduleIntervals(
  intervals: readonly WeeklyScheduleInterval[],
): boolean {
  for (let i = 0; i < intervals.length; i += 1) {
    for (let j = i + 1; j < intervals.length; j += 1) {
      if (isOverlappingWeeklyScheduleIntervals(intervals[i], intervals[j])) {
        return true;
      }
    }
  }

  return false;
}
