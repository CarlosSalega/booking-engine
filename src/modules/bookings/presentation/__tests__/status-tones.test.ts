/**
 * Tests for the shared booking status visual tones module.
 *
 * `status-tones.ts` is the single source of truth for the per-status color
 * vocabulary that both the `BookingStatusBadge` (Tailwind class names)
 * and the Schedule-X calendar (`STATUS_HEX` for `calendars` config) read
 * from. Extracting it here lets the calendar and the badge stay in sync
 * without circular imports.
 *
 * Pure: no React, no Next.js, no Prisma. Importable from both Server
 * and Client Components.
 */

import { describe, expect, it } from "vitest";

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";

import { STATUS_HEX, STATUS_TONE_CLASS } from "../status-tones";

const ALL_STATUSES: BookingStatusType[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CANCELLED,
  BookingStatus.RESCHEDULED,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
  BookingStatus.AWAITING_PAYMENT,
];

describe("STATUS_TONE_CLASS", () => {
  it("maps every BookingStatus to a Tailwind class string", () => {
    for (const status of ALL_STATUSES) {
      expect(typeof STATUS_TONE_CLASS[status]).toBe("string");
    }
  });

  it("matches the badge amber tone for PENDING", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.PENDING]).toContain("amber-500");
  });

  it("matches the badge emerald tone for CONFIRMED", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.CONFIRMED]).toContain("emerald-500");
  });

  it("matches the badge violet tone for RESCHEDULED", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.RESCHEDULED]).toContain("violet-500");
  });

  it("matches the badge emerald tone for COMPLETED", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.COMPLETED]).toContain("emerald-500");
  });

  it("matches the badge orange tone for AWAITING_PAYMENT", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.AWAITING_PAYMENT]).toContain("orange-500");
  });
});

describe("STATUS_HEX", () => {
  it("has an entry for every BookingStatus (7 total)", () => {
    expect(Object.keys(STATUS_HEX)).toHaveLength(ALL_STATUSES.length);
    for (const status of ALL_STATUSES) {
      expect(STATUS_HEX[status]).toBeDefined();
    }
  });

  it("each entry has the schedule-x required shape: colorName + lightColors + darkColors", () => {
    for (const status of ALL_STATUSES) {
      const entry = STATUS_HEX[status];
      expect(entry.colorName).toBe(status);
      expect(entry.lightColors).toBeDefined();
      expect(entry.darkColors).toBeDefined();
    }
  });

  it("each entry has main + container + onContainer colors (light and dark)", () => {
    for (const status of ALL_STATUSES) {
      const entry = STATUS_HEX[status];
      expect(entry.lightColors.main).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.lightColors.container).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.lightColors.onContainer).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.darkColors.main).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.darkColors.container).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.darkColors.onContainer).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("PENDING uses amber tones (light: amber-500 family)", () => {
    const entry = STATUS_HEX[BookingStatus.PENDING];
    // Tailwind amber-500 is #f59e0b
    expect(entry.lightColors.main.toLowerCase()).toBe("#f59e0b");
  });

  it("CONFIRMED uses emerald tones (light: emerald-500 family)", () => {
    const entry = STATUS_HEX[BookingStatus.CONFIRMED];
    // Tailwind emerald-500 is #10b981
    expect(entry.lightColors.main.toLowerCase()).toBe("#10b981");
  });

  it("CANCELLED uses red tones (light: red-500 family)", () => {
    const entry = STATUS_HEX[BookingStatus.CANCELLED];
    // Tailwind red-500 is #ef4444
    expect(entry.lightColors.main.toLowerCase()).toBe("#ef4444");
  });

  it("RESCHEDULED uses violet tones (light: violet-500 family)", () => {
    const entry = STATUS_HEX[BookingStatus.RESCHEDULED];
    // Tailwind violet-500 is #8b5cf6
    expect(entry.lightColors.main.toLowerCase()).toBe("#8b5cf6");
  });

  it("COMPLETED uses emerald tones (same family as CONFIRMED, distinguishable via opacity/context)", () => {
    const entry = STATUS_HEX[BookingStatus.COMPLETED];
    expect(entry.lightColors.main.toLowerCase()).toBe("#10b981");
  });

  it("NO_SHOW uses red tones (same family as CANCELLED, distinguishable via opacity/context)", () => {
    const entry = STATUS_HEX[BookingStatus.NO_SHOW];
    expect(entry.lightColors.main.toLowerCase()).toBe("#ef4444");
  });

  it("AWAITING_PAYMENT uses orange tones (light: orange-500 family)", () => {
    const entry = STATUS_HEX[BookingStatus.AWAITING_PAYMENT];
    // Tailwind orange-500 is #f97316
    expect(entry.lightColors.main.toLowerCase()).toBe("#f97316");
  });
});
