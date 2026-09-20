/**
 * Tone pins for the `TodayBookings` status map.
 *
 * `STATUS_TONE` is an inline copy of the shared bookings status-tones
 * vocabulary (see `src/modules/bookings/presentation/status-tones.ts`).
 * Tinted entries must use color-mix ink built from their own status
 * var plus the foreground var (70/30 split), never the solid
 * `text-status-*-foreground` fill inks — those are white/near-white in light theme and unreadable on the pale `/15`
 * tints (white-on-tint regression, PR #19 fixup part 2). This file
 * renders every status (including CANCELLED/NO_SHOW) on a `secondary`
 * badge, so every entry is tinted and every entry needs the fix.
 *
 * The module is a Server Component; only the pure tone map is pinned
 * here (no render — async Server Components are not renderable in
 * jsdom). Prisma is mocked so importing the module never touches the DB.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  BookingStatus,
  type BookingStatusType,
} from "@/modules/bookings/domain/booking";

import { STATUS_TONE } from "../today-bookings";

const ALL_STATUSES: BookingStatusType[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.AWAITING_PAYMENT,
  BookingStatus.CANCELLED,
  BookingStatus.NO_SHOW,
  BookingStatus.COMPLETED,
  BookingStatus.RESCHEDULED,
];

const TONE_VAR: Record<BookingStatusType, string> = {
  [BookingStatus.PENDING]: "--status-pending",
  [BookingStatus.CONFIRMED]: "--status-confirmed",
  [BookingStatus.AWAITING_PAYMENT]: "--status-awaiting-payment",
  [BookingStatus.CANCELLED]: "--status-cancelled",
  [BookingStatus.NO_SHOW]: "--status-no-show",
  [BookingStatus.COMPLETED]: "--status-completed",
  [BookingStatus.RESCHEDULED]: "--status-rescheduled",
};

describe("STATUS_TONE (today-bookings)", () => {
  it("covers every BookingStatus (7 total)", () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_TONE[status]).toBeDefined();
    }
  });

  it.each(ALL_STATUSES)("%s uses its tint bg with color-mix ink", (status) => {
    const token = TONE_VAR[status].replace(/^--/, "");
    expect(STATUS_TONE[status]).toContain(`bg-${token}/15`);
    // NOTE: built by concatenation (not one template literal) so Tailwind's
    // content scanner never sees a complete text-[...] candidate here.
    expect(STATUS_TONE[status]).toContain(
      "text-[color-mix(in_oklch,var(" +
        TONE_VAR[status] +
        ")_70%,var(--foreground))]",
    );
  });

  it("tinted entries never use solid text-status-*-foreground fill inks (white-on-tint regression)", () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_TONE[status]).not.toContain("text-status-");
    }
  });
});
