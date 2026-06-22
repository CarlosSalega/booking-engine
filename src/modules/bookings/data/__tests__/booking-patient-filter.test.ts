/**
 * Tests for the `patientId` filter on `getBookings` (AD5 — patients
 * module).
 *
 * The detail page at `/dashboard/patients/[id]` uses
 * `getBookings(orgId, { patientId })` to show the patient's booking
 * history. The filter is a 1-line addition to the `WHERE` clause and
 * must be:
 *   - Backwards-compatible: existing callers omit `patientId` and
 *     see no change.
 *   - Combined with other filters: `patientId` AND `status` AND `…
 *   - Returns empty when the patient has no bookings.
 *
 * The strategy mirrors the rest of the bookings data tests: mock
 * the Prisma singleton, assert the WHERE clause composition.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  booking: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  service: {
    findMany: vi.fn(),
  },
  patient: {
    findMany: vi.fn(),
  },
  professional: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const { getBookings } = await import("../booking-data");

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const PATIENT_A_ID = "00000000-0000-4000-8000-0000000000a1";
const PATIENT_B_ID = "00000000-0000-4000-8000-0000000000b1";
const PATIENT_C_ID = "00000000-0000-4000-8000-0000000000c1";

describe("getBookings — patientId filter (AD5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("adds patientId to the WHERE clause when provided", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    await getBookings(ORG_ID, { patientId: PATIENT_A_ID });

    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        organizationId: ORG_ID,
        patientId: PATIENT_A_ID,
      },
    });
  });

  it("adds patientId to the COUNT WHERE clause too", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    await getBookings(ORG_ID, { patientId: PATIENT_B_ID });

    expect(prismaMock.booking.count.mock.calls[0]?.[0]).toMatchObject({
      where: {
        organizationId: ORG_ID,
        patientId: PATIENT_B_ID,
      },
    });
  });

  it("combines patientId with status filter (AND)", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    await getBookings(ORG_ID, {
      patientId: PATIENT_A_ID,
      status: ["CONFIRMED"],
    });

    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        organizationId: ORG_ID,
        patientId: PATIENT_A_ID,
        status: { in: ["CONFIRMED"] },
      },
    });
  });

  it("does NOT add patientId to WHERE when omitted (backwards-compatible)", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    // No patientId in the filter — the existing list page behavior.
    await getBookings(ORG_ID, { status: ["PENDING"] });

    const where = prismaMock.booking.findMany.mock.calls[0]?.[0]?.where;
    expect(where).not.toHaveProperty("patientId");
  });

  it("returns an empty paginated result when the patient has no bookings", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    const result = await getBookings(ORG_ID, { patientId: PATIENT_C_ID });

    expect(result.bookings).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("does not affect the order (still orderBy: startTime desc)", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    await getBookings(ORG_ID, { patientId: PATIENT_A_ID });

    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      orderBy: { startTime: "desc" },
    });
  });
});
