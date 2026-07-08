/**
 * Tests for getPatientMetrics — new vs returning patient aggregation.
 *
 * New patients: first booking in the date range.
 * Returning patients: had bookings before the range, also booked in range.
 *
 * Spec: AND-003 (patient aggregation), AND-005 (empty handling).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  booking: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const { getPatientMetrics } = await import("../analytics-data");

const ORG_ID = "org-001";
const FROM = new Date("2026-01-01T00:00:00Z");
const TO = new Date("2026-01-31T23:59:59Z");
const RANGE = { preset: "custom" as const, from: FROM, to: TO };

describe("getPatientMetrics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns zeroed metric when no bookings with patients exist", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    const result = await getPatientMetrics(ORG_ID, RANGE);

    expect(result.newPatients).toBe(0);
    expect(result.returningPatients).toBe(0);
    expect(result.totalUnique).toBe(0);
  });

  it("distinguishes new vs returning patients", async () => {
    // 1. findMany with distinct patientIds
    prismaMock.booking.findMany.mockResolvedValueOnce([
      { patientId: "patient-a" },
      { patientId: "patient-b" },
    ]);
    // 2. findFirst for patient-a — no earlier booking (new)
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);
    // 3. findFirst for patient-b — had booking before range (returning)
    prismaMock.booking.findFirst.mockResolvedValueOnce({ id: "booking-0" });

    const result = await getPatientMetrics(ORG_ID, RANGE);

    expect(result.newPatients).toBe(1);
    expect(result.returningPatients).toBe(1);
    expect(result.totalUnique).toBe(2);
  });

  it("filters by professionalUserId when provided", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    await getPatientMetrics(ORG_ID, RANGE, "prof-101");

    const call = prismaMock.booking.findMany.mock.calls[0]?.[0];
    expect(call.where.professionalId).toBe("prof-101");
  });
});
