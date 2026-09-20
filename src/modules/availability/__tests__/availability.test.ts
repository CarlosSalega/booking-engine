import { describe, expect, it } from "vitest";

import {
  calculateAvailableSlots,
  isSlotWithinSchedule,
} from "../availability";

const monday = { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 12 * 60 };

describe("availability calculator", () => {
  it("generates slots only inside configured intervals", () => {
    const date = new Date(2026, 5, 22); // Monday
    const slots = calculateAvailableSlots([monday], date, 60, []);

    expect(slots.map((slot) => slot.startTime.getHours())).toEqual([9, 9, 10, 10, 11]);
    expect(slots[0]?.endTime.getHours()).toBe(10);
  });

  it("excludes reservations with half-open overlap semantics", () => {
    const date = new Date(2026, 5, 22);
    const slots = calculateAvailableSlots([monday], date, 60, [
      {
        startTime: new Date(2026, 5, 22, 10),
        endTime: new Date(2026, 5, 22, 11),
      },
    ]);

    expect(slots.some((slot) => slot.startTime.getHours() === 10)).toBe(false);
    expect(slots.some((slot) => slot.startTime.getHours() === 11)).toBe(true);
  });

  it("applies the configured buffer around reservations", () => {
    const date = new Date(2026, 5, 22);
    const slots = calculateAvailableSlots(
      [monday],
      date,
      30,
      [{ startTime: new Date(2026, 5, 22, 10), endTime: new Date(2026, 5, 22, 10, 30) }],
      { bufferMinutes: 15 },
    );

    expect(slots.some((slot) => slot.startTime.getHours() === 9 && slot.startTime.getMinutes() === 30)).toBe(false);
    expect(slots.some((slot) => slot.startTime.getHours() === 10 && slot.startTime.getMinutes() === 30)).toBe(false);
  });

  it("checks whether a booking fits in one configured interval", () => {
    const start = new Date(2026, 5, 22, 11);
    expect(isSlotWithinSchedule([monday], start, new Date(2026, 5, 22, 12))).toBe(true);
    expect(isSlotWithinSchedule([monday], start, new Date(2026, 5, 22, 12, 1))).toBe(false);
  });
});
