/**
 * Analytics domain — Zod 4 schema tests.
 *
 * Validates `dateRangeSchema` and `analyticsQuerySchema` per AND-001:
 *  - Valid preset range parses successfully.
 *  - Custom range without from/to fails with Spanish error message.
 *  - Custom range with valid from/to parses successfully.
 *  - Custom range where from > to fails with Spanish error message.
 *
 * Uses Zod 4 syntax (import from "zod", `error` param, etc.).
 */

import { describe, expect, it } from "vitest";

import { dateRangeSchema, analyticsQuerySchema } from "../schemas";

// ---------------------------------------------------------------------------
// dateRangeSchema — AND-001
// ---------------------------------------------------------------------------

describe("dateRangeSchema", () => {
  it("accepts a valid preset range (7d)", () => {
    const result = dateRangeSchema.safeParse({ preset: "7d" });
    expect(result.success).toBe(true);
  });

  it("accepts all preset values (30d, 3mo, 6mo)", () => {
    const presets = ["30d", "3mo", "6mo"] as const;
    presets.forEach((preset) => {
      const result = dateRangeSchema.safeParse({ preset });
      expect(result.success).toBe(true);
    });
  });

  it("fails when preset is custom but from and to are missing", () => {
    const result = dateRangeSchema.safeParse({ preset: "custom" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("from") || m.includes("to"))).toBe(true);
    }
  });

  it("accepts a valid custom range with from and to", () => {
    const result = dateRangeSchema.safeParse({
      preset: "custom",
      from: new Date("2026-01-01"),
      to: new Date("2026-01-31"),
    });
    expect(result.success).toBe(true);
  });

  it("fails when from is after to (invalid date range)", () => {
    const result = dateRangeSchema.safeParse({
      preset: "custom",
      from: new Date("2026-01-31"),
      to: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(
        messages.some(
          (m) =>
            m.includes("from") ||
            m.includes("anterior") ||
            m.includes("before") ||
            m.includes("debe"),
        ),
      ).toBe(true);
    }
  });

  it("fails for an invalid preset value", () => {
    const result = dateRangeSchema.safeParse({ preset: "1y" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// analyticsQuerySchema — wraps dateRange with optional professionalUserId.
// ---------------------------------------------------------------------------

describe("analyticsQuerySchema", () => {
  it("accepts a valid query with preset date range", () => {
    const result = analyticsQuerySchema.safeParse({
      dateRange: { preset: "7d" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a query with professionalUserId filter", () => {
    const result = analyticsQuerySchema.safeParse({
      dateRange: { preset: "30d" },
      professionalUserId: "prof-001",
    });
    expect(result.success).toBe(true);
  });

  it("fails when dateRange is missing", () => {
    const result = analyticsQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("fails when dateRange has invalid preset", () => {
    const result = analyticsQuerySchema.safeParse({
      dateRange: { preset: "invalid" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid custom date range in the query", () => {
    const result = analyticsQuerySchema.safeParse({
      dateRange: {
        preset: "custom",
        from: new Date("2026-01-01"),
        to: new Date("2026-01-31"),
      },
    });
    expect(result.success).toBe(true);
  });

  it("fails when custom range has from > to in the query", () => {
    const result = analyticsQuerySchema.safeParse({
      dateRange: {
        preset: "custom",
        from: new Date("2026-02-01"),
        to: new Date("2026-01-01"),
      },
    });
    expect(result.success).toBe(false);
  });
});
