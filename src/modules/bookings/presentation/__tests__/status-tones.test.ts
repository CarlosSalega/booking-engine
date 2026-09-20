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
 *
  * Slice 2 (ux-audit-fixes) lockstep update:
  *   - `STATUS_TONE_CLASS` values now reference the semantic token
  *     classes (`bg-status-pending/15`,
  *     `text-[color-mix(in_oklch,var(--status-pending)_70%,var(--foreground))]`,
  *     …) defined in `globals.css` rather than raw Tailwind palette
  *     substrings (`amber-500`, `emerald-500`, …). CANCELLED and
  *     NO_SHOW remain empty strings — the badge variant (destructive)
  *     carries their color.
  *   - Badge text uses color-mix ink (status token 70% + `--foreground`)
  *     instead of the solid `-foreground` fill inks: the `-foreground`
  *     tokens are white/near-white in light theme (white text on a
  *     pale `/15` tint is unreadable — reported on CONFIRMED).
  *   - `STATUS_HEX` for CANCELLED is now neutral gray (D1 supersession;
 *     the previous red rendered every cancellation as an emergency)
 *     and COMPLETED is now dark neutral (D1; the previous emerald
 *     collided with CONFIRMED). Hex values approximate the
 *     `--status-cancelled` / `--status-completed` tokens because
 *     Schedule-X requires concrete colors.
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

  // -------------------------------------------------------------------------
  // Slice 2 — every tone references a semantic --status-* token class
  // (no raw palette substrings like amber-500 / emerald-500 / etc.).
  // CANCELLED and NO_SHOW stay as empty strings because their color
  // comes from the `destructive` Badge variant.
  // -------------------------------------------------------------------------

  it("PENDING references --status-pending token classes", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.PENDING]).toContain(
      "bg-status-pending/15",
    );
    expect(STATUS_TONE_CLASS[BookingStatus.PENDING]).toContain(
      "text-[color-mix(in_oklch,var(--status-pending)_70%,var(--foreground))]",
    );
  });

  it("CONFIRMED references --status-confirmed token classes", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.CONFIRMED]).toContain(
      "bg-status-confirmed/15",
    );
    expect(STATUS_TONE_CLASS[BookingStatus.CONFIRMED]).toContain(
      "text-[color-mix(in_oklch,var(--status-confirmed)_70%,var(--foreground))]",
    );
  });

  it("AWAITING_PAYMENT references --status-awaiting-payment token classes", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.AWAITING_PAYMENT]).toContain(
      "bg-status-awaiting-payment/15",
    );
    expect(STATUS_TONE_CLASS[BookingStatus.AWAITING_PAYMENT]).toContain(
      "text-[color-mix(in_oklch,var(--status-awaiting-payment)_70%,var(--foreground))]",
    );
  });

  it("RESCHEDULED references --status-rescheduled token classes", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.RESCHEDULED]).toContain(
      "bg-status-rescheduled/15",
    );
    expect(STATUS_TONE_CLASS[BookingStatus.RESCHEDULED]).toContain(
      "text-[color-mix(in_oklch,var(--status-rescheduled)_70%,var(--foreground))]",
    );
  });

  it("COMPLETED references --status-completed token classes (D1 dark-neutral, NOT emerald)", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.COMPLETED]).toContain(
      "bg-status-completed/15",
    );
    expect(STATUS_TONE_CLASS[BookingStatus.COMPLETED]).toContain(
      "text-[color-mix(in_oklch,var(--status-completed)_70%,var(--foreground))]",
    );
  });

  it("tinted entries never use solid text-status-*-foreground fill inks (white-on-tint regression)", () => {
    const TINTED: BookingStatusType[] = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.RESCHEDULED,
      BookingStatus.COMPLETED,
      BookingStatus.AWAITING_PAYMENT,
    ];
    for (const status of TINTED) {
      expect(STATUS_TONE_CLASS[status]).not.toContain("text-status-");
    }
  });

  it("CANCELLED is empty (variant=destructive carries the color, D1 gray)", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.CANCELLED]).toBe("");
  });

  it("NO_SHOW is empty (variant=destructive carries the color)", () => {
    expect(STATUS_TONE_CLASS[BookingStatus.NO_SHOW]).toBe("");
  });

  it("contains zero raw Tailwind palette substrings (no amber-500, emerald-500, violet-500, orange-500, sky-500, red-500, yellow-500)", () => {
    const FORBIDDEN = [
      "amber-500",
      "emerald-500",
      "violet-500",
      "orange-500",
      "sky-500",
      "red-500",
      "yellow-500",
      "green-500",
    ];
    for (const status of ALL_STATUSES) {
      for (const palette of FORBIDDEN) {
        expect(STATUS_TONE_CLASS[status]).not.toContain(palette);
      }
    }
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

  it("CANCELLED uses neutral gray tones (D1: cancellations should NOT read as emergencies)", () => {
    const entry = STATUS_HEX[BookingStatus.CANCELLED];
    // D1 supersession — gray family replaces the previous red.
    // Approximation of --status-cancelled (oklch(0.55 0.04 257.4)).
    expect(entry.lightColors.main.toLowerCase()).toBe("#6b7280");
  });

  it("RESCHEDULED uses violet tones (light: violet-500 family)", () => {
    const entry = STATUS_HEX[BookingStatus.RESCHEDULED];
    // Tailwind violet-500 is #8b5cf6
    expect(entry.lightColors.main.toLowerCase()).toBe("#8b5cf6");
  });

  it("COMPLETED uses dark-neutral tones (D1: COMPLETED no longer shares the emerald family with CONFIRMED)", () => {
    const entry = STATUS_HEX[BookingStatus.COMPLETED];
    // D1 supersession — dark-neutral slate replaces the previous emerald.
    // Approximation of --status-completed (oklch(0.37 0.04 257.3)).
    expect(entry.lightColors.main.toLowerCase()).toBe("#475569");
  });

  it("NO_SHOW uses red tones (same family as the destructive variant — distinct from CANCELLED gray by design)", () => {
    const entry = STATUS_HEX[BookingStatus.NO_SHOW];
    expect(entry.lightColors.main.toLowerCase()).toBe("#ef4444");
  });

  it("AWAITING_PAYMENT uses orange tones (light: orange-500 family)", () => {
    const entry = STATUS_HEX[BookingStatus.AWAITING_PAYMENT];
    // Tailwind orange-500 is #f97316
    expect(entry.lightColors.main.toLowerCase()).toBe("#f97316");
  });

  it("CANCELLED light/dark hexes are gray family (no red family anywhere)", () => {
    const entry = STATUS_HEX[BookingStatus.CANCELLED];
    // Sanity: no red-family hex in the triple.
    const redish = /^#(ef|f[0-9a-f]{2})[0-9a-f]{4}$/i;
    expect(redish.test(entry.lightColors.main)).toBe(false);
    expect(redish.test(entry.lightColors.container)).toBe(false);
    expect(redish.test(entry.lightColors.onContainer)).toBe(false);
    expect(redish.test(entry.darkColors.main)).toBe(false);
    expect(redish.test(entry.darkColors.container)).toBe(false);
    expect(redish.test(entry.darkColors.onContainer)).toBe(false);
  });
});
