import { describe, expect, it } from "vitest";

import {
  DAY_OF_WEEK,
  hasOverlappingWeeklyScheduleIntervals,
  isOverlappingWeeklyScheduleIntervals,
  isValidDayOfWeek,
  isValidMinute,
  isValidWeeklyScheduleInterval,
  MINUTES_PER_DAY,
  type WeeklyScheduleInterval,
} from "../weekly-schedule-interval";
import { weeklyScheduleIntervalSchema } from "../weekly-schedule-interval.schema";

const morning: WeeklyScheduleInterval = {
  dayOfWeek: DAY_OF_WEEK.MONDAY,
  startMinute: 9 * 60,
  endMinute: 12 * 60,
};

describe("weekly schedule interval constants and validation", () => {
  it("uses Sunday through Saturday as day values 0 through 6", () => {
    expect(Object.values(DAY_OF_WEEK)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it.each([0, 1, 1439, MINUTES_PER_DAY])(
    "accepts minute boundary %s",
    (minute) => {
      expect(isValidMinute(minute)).toBe(true);
    },
  );

  it.each([-1, 1441, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid minute %s",
    (minute) => {
      expect(isValidMinute(minute)).toBe(false);
    },
  );

  it.each([0, 6])("accepts day of week %s", (dayOfWeek) => {
    expect(isValidDayOfWeek(dayOfWeek)).toBe(true);
  });

  it.each([-1, 7, 1.5, Number.NaN])("rejects day of week %s", (dayOfWeek) => {
    expect(isValidDayOfWeek(dayOfWeek)).toBe(false);
  });

  it("accepts a regular interval", () => {
    expect(isValidWeeklyScheduleInterval(morning)).toBe(true);
  });

  it("accepts an interval ending at midnight", () => {
    expect(
      isValidWeeklyScheduleInterval({
        dayOfWeek: DAY_OF_WEEK.FRIDAY,
        startMinute: 23 * 60,
        endMinute: MINUTES_PER_DAY,
      }),
    ).toBe(true);
  });

  it.each([
    { dayOfWeek: -1, startMinute: 60, endMinute: 120 },
    { dayOfWeek: 7, startMinute: 60, endMinute: 120 },
    { dayOfWeek: DAY_OF_WEEK.MONDAY, startMinute: -1, endMinute: 120 },
    { dayOfWeek: DAY_OF_WEEK.MONDAY, startMinute: 1440, endMinute: 1440 },
    { dayOfWeek: DAY_OF_WEEK.MONDAY, startMinute: 120, endMinute: 120 },
    { dayOfWeek: DAY_OF_WEEK.MONDAY, startMinute: 180, endMinute: 120 },
  ])("rejects invalid interval %#", (interval) => {
    expect(isValidWeeklyScheduleInterval(interval)).toBe(false);
  });
});

describe("weeklyScheduleIntervalSchema", () => {
  it("parses a valid interval", () => {
    const result = weeklyScheduleIntervalSchema.safeParse(morning);

    expect(result.success).toBe(true);
  });

  it("rejects non-integer day and minute values", () => {
    const result = weeklyScheduleIntervalSchema.safeParse({
      dayOfWeek: 1.5,
      startMinute: 9 * 60 + 30.5,
      endMinute: 12 * 60,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an interval whose start is not before its end", () => {
    const result = weeklyScheduleIntervalSchema.safeParse({
      ...morning,
      startMinute: morning.endMinute,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "endMinute"))
        .toBe(true);
    }
  });

  it("rejects a start at the end-of-day boundary", () => {
    const result = weeklyScheduleIntervalSchema.safeParse({
      dayOfWeek: DAY_OF_WEEK.MONDAY,
      startMinute: MINUTES_PER_DAY,
      endMinute: MINUTES_PER_DAY,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = weeklyScheduleIntervalSchema.safeParse({
      ...morning,
      id: "interval-id",
    });

    expect(result.success).toBe(false);
  });
});

describe("isOverlappingWeeklyScheduleIntervals", () => {
  it("detects partial and contained overlaps on the same day", () => {
    expect(
      isOverlappingWeeklyScheduleIntervals(morning, {
        ...morning,
        startMinute: 11 * 60,
        endMinute: 13 * 60,
      }),
    ).toBe(true);
    expect(
      isOverlappingWeeklyScheduleIntervals(morning, {
        ...morning,
        startMinute: 10 * 60,
        endMinute: 11 * 60,
      }),
    ).toBe(true);
  });

  it("does not treat adjacent intervals as overlapping", () => {
    expect(
      isOverlappingWeeklyScheduleIntervals(morning, {
        ...morning,
        startMinute: morning.endMinute,
        endMinute: 13 * 60,
      }),
    ).toBe(false);
  });

  it("does not overlap intervals on different days", () => {
    expect(
      isOverlappingWeeklyScheduleIntervals(morning, {
        ...morning,
        dayOfWeek: DAY_OF_WEEK.TUESDAY,
      }),
    ).toBe(false);
  });
});

describe("hasOverlappingWeeklyScheduleIntervals", () => {
  it("returns false for an empty or single-interval collection", () => {
    expect(hasOverlappingWeeklyScheduleIntervals([])).toBe(false);
    expect(hasOverlappingWeeklyScheduleIntervals([morning])).toBe(false);
  });

  it("detects an overlap anywhere in the collection", () => {
    expect(
      hasOverlappingWeeklyScheduleIntervals([
        morning,
        { ...morning, dayOfWeek: DAY_OF_WEEK.TUESDAY },
        { ...morning, startMinute: 11 * 60, endMinute: 13 * 60 },
      ]),
    ).toBe(true);
  });

  it("allows adjacent intervals and intervals on other days", () => {
    expect(
      hasOverlappingWeeklyScheduleIntervals([
        morning,
        { ...morning, startMinute: 12 * 60, endMinute: 13 * 60 },
        { ...morning, dayOfWeek: DAY_OF_WEEK.TUESDAY },
      ]),
    ).toBe(false);
  });
});
