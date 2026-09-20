/**
 * Tone pins for the `RecentActivity` activity-type map.
 *
 * The `TONE` map paints icon tiles on pale `/15` tints, so entries must
 * use color-mix ink built from their own var plus the foreground var,
 * never the solid fill inks (`text-info-foreground`, `text-success-foreground`,
 * `text-status-completed-foreground`) — those are white/near-white in
 * light theme and unreadable on the tints (white-on-tint regression,
 * PR #19 fixup part 2 — same root cause as the shared bookings
 * status-tones map).
 *
 * Only the pure tone map is pinned here (no render — async Server
 * Components are not renderable in jsdom). Prisma is mocked so
 * importing the module never touches the DB.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import type { ActivityType } from "@/modules/dashboard";

import { TONE } from "../recent-activity";

describe("TONE (recent-activity)", () => {
  it("booking uses --info tint with color-mix ink", () => {
    expect(TONE.booking).toContain("bg-info/15");
    expect(TONE.booking).toContain(
      "text-[color-mix(in_oklch,var(--info)_70%,var(--foreground))]",
    );
  });

  it("payment uses --success tint with color-mix ink", () => {
    expect(TONE.payment).toContain("bg-success/15");
    expect(TONE.payment).toContain(
      "text-[color-mix(in_oklch,var(--success)_70%,var(--foreground))]",
    );
  });

  it("patient uses --status-completed tint with color-mix ink", () => {
    expect(TONE.patient).toContain("bg-status-completed/15");
    expect(TONE.patient).toContain(
      "text-[color-mix(in_oklch,var(--status-completed)_70%,var(--foreground))]",
    );
  });

  it("tinted entries never use solid fill inks (white-on-tint regression)", () => {
    const ALL: ActivityType[] = ["booking", "payment", "patient"];
    for (const type of ALL) {
      expect(TONE[type]).not.toContain("text-info-");
      expect(TONE[type]).not.toContain("text-success-");
      expect(TONE[type]).not.toContain("text-status-");
    }
  });
});
