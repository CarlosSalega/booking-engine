/**
 * Analytics domain — constants tests.
 *
 * Validates `DATE_RANGE_PRESETS` and `METRIC_LABELS`:
 *  - DATE_RANGE_PRESETS has exactly 4 preset entries.
 *  - METRIC_LABELS maps all metric keys to human-readable labels.
 *
 * Spec source: openspec/changes/analytics/specs/analytics-domain/spec.md
 * — AND-001 (presets), AND-002 (metric labels).
 */

import { describe, expect, it } from "vitest";

import { DATE_RANGE_PRESETS, METRIC_LABELS } from "../constants";

// ---------------------------------------------------------------------------
// DATE_RANGE_PRESETS — AND-001
// ---------------------------------------------------------------------------

describe("DATE_RANGE_PRESETS", () => {
  it("has exactly 4 preset entries (7d, 30d, 3mo, 6mo)", () => {
    expect(Object.keys(DATE_RANGE_PRESETS)).toHaveLength(4);
  });

  it("contains all required preset keys", () => {
    expect(DATE_RANGE_PRESETS).toHaveProperty("7d");
    expect(DATE_RANGE_PRESETS).toHaveProperty("30d");
    expect(DATE_RANGE_PRESETS).toHaveProperty("3mo");
    expect(DATE_RANGE_PRESETS).toHaveProperty("6mo");
  });

  it("each preset has a label string", () => {
    Object.values(DATE_RANGE_PRESETS).forEach((preset) => {
      expect(typeof preset.label).toBe("string");
      expect(preset.label.length).toBeGreaterThan(0);
    });
  });

  it("each preset has a days number", () => {
    expect(DATE_RANGE_PRESETS["7d"].days).toBe(7);
    expect(DATE_RANGE_PRESETS["30d"].days).toBe(30);
    expect(DATE_RANGE_PRESETS["3mo"].days).toBe(90);
    expect(DATE_RANGE_PRESETS["6mo"].days).toBe(180);
  });
});

// ---------------------------------------------------------------------------
// METRIC_LABELS — AND-002: maps metric keys to display labels.
// ---------------------------------------------------------------------------

describe("METRIC_LABELS", () => {
  it("maps revenue metric", () => {
    expect(METRIC_LABELS).toHaveProperty("revenue");
    expect(typeof METRIC_LABELS.revenue).toBe("string");
  });

  it("maps bookings metric", () => {
    expect(METRIC_LABELS).toHaveProperty("bookings");
    expect(typeof METRIC_LABELS.bookings).toBe("string");
  });

  it("maps occupancy metric", () => {
    expect(METRIC_LABELS).toHaveProperty("occupancy");
    expect(typeof METRIC_LABELS.occupancy).toBe("string");
  });

  it("maps patients metric", () => {
    expect(METRIC_LABELS).toHaveProperty("patients");
    expect(typeof METRIC_LABELS.patients).toBe("string");
  });

  it("maps topServices metric", () => {
    expect(METRIC_LABELS).toHaveProperty("topServices");
    expect(typeof METRIC_LABELS.topServices).toBe("string");
  });

  it("maps topProfessionals metric", () => {
    expect(METRIC_LABELS).toHaveProperty("topProfessionals");
    expect(typeof METRIC_LABELS.topProfessionals).toBe("string");
  });

  it("maps peakHours metric", () => {
    expect(METRIC_LABELS).toHaveProperty("peakHours");
    expect(typeof METRIC_LABELS.peakHours).toBe("string");
  });

  it("maps dayDistribution metric", () => {
    expect(METRIC_LABELS).toHaveProperty("dayDistribution");
    expect(typeof METRIC_LABELS.dayDistribution).toBe("string");
  });

  it("has exactly 8 metric labels", () => {
    expect(Object.keys(METRIC_LABELS)).toHaveLength(8);
  });
});
