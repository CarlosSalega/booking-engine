/**
 * Analytics domain — type-level tests.
 *
 * Verifies the shape of DateRange, all metric interfaces, and
 * AnalyticsResponse. These tests run at compile time AND runtime:
 *  - `expectTypeOf` enforces structural type contracts.
 *  - Sample objects verify runtime conformance to the interfaces.
 *
 * Spec source: openspec/changes/analytics/specs/analytics-domain/spec.md
 * — AND-001 (DateRange), AND-002 (Metric types).
 */

import { describe, expect, it, expectTypeOf } from "vitest";

import type {
  DateRange,
  RevenueMetric,
  BookingMetric,
  OccupancyMetric,
  PatientMetric,
  ServiceMetric,
  ProfessionalMetric,
  PeakHourMetric,
  DayDistributionMetric,
  AnalyticsResponse,
} from "../types";

// ---------------------------------------------------------------------------
// Fixtures — sample objects conforming to each interface.
// ---------------------------------------------------------------------------

const samplePresetDateRange: DateRange = { preset: "7d" };
const sampleCustomDateRange: DateRange = {
  preset: "custom",
  from: new Date("2026-01-01"),
  to: new Date("2026-01-31"),
};

const sampleRevenueMetric: RevenueMetric = {
  total: 15000,
  averagePerBooking: 500,
  dailyRevenue: [{ date: "2026-01-15", amount: 3000 }],
  monthlyRevenue: [{ month: "2026-01", amount: 15000 }],
};

const sampleBookingMetric: BookingMetric = {
  total: 100,
  confirmed: 80,
  cancelled: 10,
  completed: 10,
  completionRate: 0.1,
};

const sampleOccupancyMetric: OccupancyMetric = {
  occupiedSlots: 75,
  totalSlots: 100,
  rate: 0.75,
};

const samplePatientMetric: PatientMetric = {
  newPatients: 30,
  returningPatients: 70,
  totalUnique: 100,
};

const sampleServiceMetric: ServiceMetric = {
  serviceId: "svc-001",
  serviceName: "Consulta General",
  count: 50,
  revenue: 25000,
};

const sampleProfessionalMetric: ProfessionalMetric = {
  professionalUserId: "prof-001",
  name: "Dr. García",
  count: 40,
  revenue: 20000,
  occupancyRate: 0.8,
};

const samplePeakHourMetric: PeakHourMetric = {
  hour: 10,
  count: 15,
};

const sampleDayDistributionMetric: DayDistributionMetric = {
  dayOfWeek: 1,
  count: 25,
};

const sampleAnalyticsResponse: AnalyticsResponse = {
  revenue: sampleRevenueMetric,
  bookings: sampleBookingMetric,
  occupancy: sampleOccupancyMetric,
  patients: samplePatientMetric,
  topServices: [sampleServiceMetric],
  topProfessionals: [sampleProfessionalMetric],
  peakHours: [samplePeakHourMetric],
  dayDistribution: [sampleDayDistributionMetric],
};

// ---------------------------------------------------------------------------
// DateRange — AND-001: union type with preset or custom+bounds.
// ---------------------------------------------------------------------------

describe("DateRange type", () => {
  it("accepts preset-only ranges (7d, 30d, 3mo, 6mo)", () => {
    const presets: DateRange[] = [
      { preset: "7d" },
      { preset: "30d" },
      { preset: "3mo" },
      { preset: "6mo" },
    ];
    expect(presets).toHaveLength(4);
    presets.forEach((range) => {
      expect(range.preset).toBeDefined();
    });
  });

  it("accepts custom range with from and to dates", () => {
    expect(sampleCustomDateRange.preset).toBe("custom");
    if (sampleCustomDateRange.preset === "custom") {
      expect(sampleCustomDateRange.from).toBeInstanceOf(Date);
      expect(sampleCustomDateRange.to).toBeInstanceOf(Date);
    }
  });

  it("DateRange is a discriminated union on preset field", () => {
    expectTypeOf(samplePresetDateRange).toHaveProperty("preset");
    expectTypeOf(sampleCustomDateRange).toHaveProperty("preset");
    expectTypeOf(sampleCustomDateRange).toHaveProperty("from");
    expectTypeOf(sampleCustomDateRange).toHaveProperty("to");
  });
});

// ---------------------------------------------------------------------------
// RevenueMetric — AND-002: total, averagePerBooking, daily, monthly.
// ---------------------------------------------------------------------------

describe("RevenueMetric type", () => {
  it("has required numeric fields and revenue arrays", () => {
    expect(typeof sampleRevenueMetric.total).toBe("number");
    expect(typeof sampleRevenueMetric.averagePerBooking).toBe("number");
    expect(Array.isArray(sampleRevenueMetric.dailyRevenue)).toBe(true);
    expect(Array.isArray(sampleRevenueMetric.monthlyRevenue)).toBe(true);
  });

  it("dailyRevenue entries have date string and amount number", () => {
    const entry = sampleRevenueMetric.dailyRevenue[0];
    expect(typeof entry.date).toBe("string");
    expect(typeof entry.amount).toBe("number");
  });

  it("monthlyRevenue entries have month string and amount number", () => {
    const entry = sampleRevenueMetric.monthlyRevenue[0];
    expect(typeof entry.month).toBe("string");
    expect(typeof entry.amount).toBe("number");
  });

  it("type-checks the shape", () => {
    expectTypeOf(sampleRevenueMetric.total).toBeNumber();
    expectTypeOf(sampleRevenueMetric.averagePerBooking).toBeNumber();
    expectTypeOf(sampleRevenueMetric.dailyRevenue).toBeArray();
    expectTypeOf(sampleRevenueMetric.monthlyRevenue).toBeArray();
  });
});

// ---------------------------------------------------------------------------
// BookingMetric — AND-002: total, confirmed, cancelled, completed, completionRate.
// ---------------------------------------------------------------------------

describe("BookingMetric type", () => {
  it("has all required numeric fields", () => {
    expect(typeof sampleBookingMetric.total).toBe("number");
    expect(typeof sampleBookingMetric.confirmed).toBe("number");
    expect(typeof sampleBookingMetric.cancelled).toBe("number");
    expect(typeof sampleBookingMetric.completed).toBe("number");
    expect(typeof sampleBookingMetric.completionRate).toBe("number");
  });

  it("type-checks the shape", () => {
    expectTypeOf(sampleBookingMetric.total).toBeNumber();
    expectTypeOf(sampleBookingMetric.confirmed).toBeNumber();
    expectTypeOf(sampleBookingMetric.cancelled).toBeNumber();
    expectTypeOf(sampleBookingMetric.completed).toBeNumber();
    expectTypeOf(sampleBookingMetric.completionRate).toBeNumber();
  });
});

// ---------------------------------------------------------------------------
// OccupancyMetric — AND-002: occupiedSlots, totalSlots, rate (0–1).
// ---------------------------------------------------------------------------

describe("OccupancyMetric type", () => {
  it("has required fields with correct types", () => {
    expect(typeof sampleOccupancyMetric.occupiedSlots).toBe("number");
    expect(typeof sampleOccupancyMetric.totalSlots).toBe("number");
    expect(typeof sampleOccupancyMetric.rate).toBe("number");
  });

  it("rate is between 0 and 1", () => {
    expect(sampleOccupancyMetric.rate).toBeGreaterThanOrEqual(0);
    expect(sampleOccupancyMetric.rate).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// PatientMetric — AND-002: newPatients, returningPatients, totalUnique.
// ---------------------------------------------------------------------------

describe("PatientMetric type", () => {
  it("has required fields with correct types", () => {
    expect(typeof samplePatientMetric.newPatients).toBe("number");
    expect(typeof samplePatientMetric.returningPatients).toBe("number");
    expect(typeof samplePatientMetric.totalUnique).toBe("number");
  });

  it("totalUnique is sum of new and returning", () => {
    expect(samplePatientMetric.totalUnique).toBe(
      samplePatientMetric.newPatients + samplePatientMetric.returningPatients,
    );
  });
});

// ---------------------------------------------------------------------------
// ServiceMetric — AND-002: serviceId, serviceName, count, revenue.
// ---------------------------------------------------------------------------

describe("ServiceMetric type", () => {
  it("has required fields with correct types", () => {
    expect(typeof sampleServiceMetric.serviceId).toBe("string");
    expect(typeof sampleServiceMetric.serviceName).toBe("string");
    expect(typeof sampleServiceMetric.count).toBe("number");
    expect(typeof sampleServiceMetric.revenue).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// ProfessionalMetric — AND-002: professionalUserId, name, count, revenue, occupancyRate.
// ---------------------------------------------------------------------------

describe("ProfessionalMetric type", () => {
  it("has required fields with correct types", () => {
    expect(typeof sampleProfessionalMetric.professionalUserId).toBe("string");
    expect(typeof sampleProfessionalMetric.name).toBe("string");
    expect(typeof sampleProfessionalMetric.count).toBe("number");
    expect(typeof sampleProfessionalMetric.revenue).toBe("number");
    expect(typeof sampleProfessionalMetric.occupancyRate).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// PeakHourMetric — AND-002: hour (0–23), count.
// ---------------------------------------------------------------------------

describe("PeakHourMetric type", () => {
  it("has hour and count as numbers", () => {
    expect(typeof samplePeakHourMetric.hour).toBe("number");
    expect(typeof samplePeakHourMetric.count).toBe("number");
  });

  it("hour is in valid range 0–23", () => {
    expect(samplePeakHourMetric.hour).toBeGreaterThanOrEqual(0);
    expect(samplePeakHourMetric.hour).toBeLessThanOrEqual(23);
  });
});

// ---------------------------------------------------------------------------
// DayDistributionMetric — AND-002: dayOfWeek (0–6), count.
// ---------------------------------------------------------------------------

describe("DayDistributionMetric type", () => {
  it("has dayOfWeek and count as numbers", () => {
    expect(typeof sampleDayDistributionMetric.dayOfWeek).toBe("number");
    expect(typeof sampleDayDistributionMetric.count).toBe("number");
  });

  it("dayOfWeek is in valid range 0–6", () => {
    expect(sampleDayDistributionMetric.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(sampleDayDistributionMetric.dayOfWeek).toBeLessThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// AnalyticsResponse — AND-002: aggregates all metrics.
// ---------------------------------------------------------------------------

describe("AnalyticsResponse type", () => {
  it("has all required metric sections", () => {
    expect(sampleAnalyticsResponse.revenue).toBeDefined();
    expect(sampleAnalyticsResponse.bookings).toBeDefined();
    expect(sampleAnalyticsResponse.occupancy).toBeDefined();
    expect(sampleAnalyticsResponse.patients).toBeDefined();
    expect(Array.isArray(sampleAnalyticsResponse.topServices)).toBe(true);
    expect(Array.isArray(sampleAnalyticsResponse.topProfessionals)).toBe(true);
    expect(Array.isArray(sampleAnalyticsResponse.peakHours)).toBe(true);
    expect(Array.isArray(sampleAnalyticsResponse.dayDistribution)).toBe(true);
  });

  it("type-checks all nested metric shapes", () => {
    expectTypeOf(sampleAnalyticsResponse.revenue).toEqualTypeOf<RevenueMetric>();
    expectTypeOf(sampleAnalyticsResponse.bookings).toEqualTypeOf<BookingMetric>();
    expectTypeOf(sampleAnalyticsResponse.occupancy).toEqualTypeOf<OccupancyMetric>();
    expectTypeOf(sampleAnalyticsResponse.patients).toEqualTypeOf<PatientMetric>();
    expectTypeOf(sampleAnalyticsResponse.topServices).toEqualTypeOf<ServiceMetric[]>();
    expectTypeOf(sampleAnalyticsResponse.topProfessionals).toEqualTypeOf<ProfessionalMetric[]>();
    expectTypeOf(sampleAnalyticsResponse.peakHours).toEqualTypeOf<PeakHourMetric[]>();
    expectTypeOf(sampleAnalyticsResponse.dayDistribution).toEqualTypeOf<DayDistributionMetric[]>();
  });

  it("accepts empty arrays for list fields (AND-005: no null)", () => {
    const emptyResponse: AnalyticsResponse = {
      ...sampleAnalyticsResponse,
      topServices: [],
      topProfessionals: [],
      peakHours: [],
      dayDistribution: [],
    };
    expect(emptyResponse.topServices).toHaveLength(0);
    expect(emptyResponse.topProfessionals).toHaveLength(0);
    expect(emptyResponse.peakHours).toHaveLength(0);
    expect(emptyResponse.dayDistribution).toHaveLength(0);
  });
});
