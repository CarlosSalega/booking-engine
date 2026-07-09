/**
 * Analytics domain — helper function tests.
 *
 * Validates `getDateBoundaries` and `formatMetricValue` per AND-004:
 *  - Argentina timezone boundaries for preset ranges.
 *  - 7d/30d/3mo/6mo presets compute correct day offsets.
 *  - formatMetricValue formats numbers, currency, and percentages.
 *
 * Spec source: openspec/changes/analytics/specs/analytics-domain/spec.md
 * — AND-004 (timezone-aware helpers).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { getDateBoundaries, formatMetricValue } from "../helpers";

// ---------------------------------------------------------------------------
// getDateBoundaries — AND-004: UTC boundary timestamps from preset + timezone.
// ---------------------------------------------------------------------------

describe("getDateBoundaries", () => {
  beforeEach(() => {
    // Fix "now" to 2026-06-15T12:00:00Z for deterministic tests.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns from and to as Date objects", () => {
    const result = getDateBoundaries({ preset: "7d" }, "America/Argentina/Buenos_Aires");
    expect(result.from).toBeInstanceOf(Date);
    expect(result.to).toBeInstanceOf(Date);
  });

  it("7d preset: from is 7 days before now, to is now", () => {
    const result = getDateBoundaries({ preset: "7d" }, "America/Argentina/Buenos_Aires");

    // 7 days before 2026-06-15 is 2026-06-08
    // from = 2026-06-08T00:00:00 ART = 2026-06-08T03:00:00Z
    expect(result.from.getUTCFullYear()).toBe(2026);
    expect(result.from.getUTCMonth()).toBe(5); // June (0-indexed)
    expect(result.from.getUTCDate()).toBe(8);

    // to = end of today in ART = 2026-06-16T02:59:59.999Z
    // (June 15 23:59:59 ART = June 16 02:59:59 UTC)
    expect(result.to.getUTCFullYear()).toBe(2026);
    expect(result.to.getUTCMonth()).toBe(5);
    expect(result.to.getUTCDate()).toBe(16);
  });

  it("30d preset: from is 30 days before now", () => {
    const result = getDateBoundaries({ preset: "30d" }, "America/Argentina/Buenos_Aires");

    // 30 days before 2026-06-15 is 2026-05-16
    // from = 2026-05-16T00:00:00 ART = 2026-05-16T03:00:00Z
    expect(result.from.getUTCFullYear()).toBe(2026);
    expect(result.from.getUTCMonth()).toBe(4); // May (0-indexed)
    expect(result.from.getUTCDate()).toBe(16);
  });

  it("3mo preset: from is 90 days before now", () => {
    const result = getDateBoundaries({ preset: "3mo" }, "America/Argentina/Buenos_Aires");

    // 90 days before 2026-06-15 is 2026-03-17
    // from = 2026-03-17T00:00:00 ART = 2026-03-17T03:00:00Z
    expect(result.from.getUTCFullYear()).toBe(2026);
    expect(result.from.getUTCMonth()).toBe(2); // March (0-indexed)
    expect(result.from.getUTCDate()).toBe(17);
  });

  it("6mo preset: from is 180 days before now", () => {
    const result = getDateBoundaries({ preset: "6mo" }, "America/Argentina/Buenos_Aires");

    // 180 days before 2026-06-15 is 2025-12-17
    // from = 2025-12-17T00:00:00 ART = 2025-12-17T03:00:00Z
    expect(result.from.getUTCFullYear()).toBe(2025);
    expect(result.from.getUTCMonth()).toBe(11); // December (0-indexed)
    expect(result.from.getUTCDate()).toBe(17);
  });

  it("custom range: from and to are passed through", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-01-31T23:59:59Z");
    const result = getDateBoundaries(
      { preset: "custom", from, to },
      "America/Argentina/Buenos_Aires",
    );

    expect(result.from.getTime()).toBe(from.getTime());
    expect(result.to.getTime()).toBe(to.getTime());
  });

  it("Argentina timezone: from is start-of-day in ART, to is end-of-day in ART", () => {
    const result = getDateBoundaries({ preset: "7d" }, "America/Argentina/Buenos_Aires");

    // Argentina is UTC-3. Start of day 2026-06-08 in ART = 2026-06-08T03:00:00Z
    expect(result.from.getUTCHours()).toBe(3);
    expect(result.from.getUTCMinutes()).toBe(0);

    // End of day 2026-06-15 in ART = 2026-06-16T02:59:59.999Z
    expect(result.to.getUTCHours()).toBe(2);
    expect(result.to.getUTCMinutes()).toBe(59);
  });

  it("different timezone produces different UTC offsets", () => {
    const resultART = getDateBoundaries({ preset: "7d" }, "America/Argentina/Buenos_Aires");
    const resultUTC = getDateBoundaries({ preset: "7d" }, "UTC");

    // UTC from should be at midnight UTC, ART at 3am UTC
    expect(resultUTC.from.getUTCHours()).toBe(0);
    expect(resultART.from.getUTCHours()).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// formatMetricValue — displays metric values in human-readable format.
// ---------------------------------------------------------------------------

describe("formatMetricValue", () => {
  it("formats a number with locale grouping", () => {
    const result = formatMetricValue(15000, "number");
    expect(result).toBe("15.000"); // Argentine locale uses dots for thousands
  });

  it("formats currency values", () => {
    const result = formatMetricValue(15000.5, "currency");
    expect(result).toContain("15.000");
    expect(result).toContain("$");
  });

  it("formats percentage values", () => {
    const result = formatMetricValue(0.75, "percentage");
    expect(result).toContain("75");
    expect(result).toContain("%");
  });

  it("formats zero correctly", () => {
    expect(formatMetricValue(0, "number")).toBeDefined();
    expect(formatMetricValue(0, "currency")).toBeDefined();
    expect(formatMetricValue(0, "percentage")).toBeDefined();
  });

  it("formats decimal numbers", () => {
    const result = formatMetricValue(1234.56, "number");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("handles negative values", () => {
    const result = formatMetricValue(-500, "number");
    expect(result).toBeDefined();
    expect(result).toContain("500");
  });
});
