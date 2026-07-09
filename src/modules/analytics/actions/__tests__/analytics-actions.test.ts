/**
 * Tests for `getAnalyticsAction` — Server Action with RBAC + Zod validation.
 *
 * Mocks the same boundaries as the settings action tests:
 *  1. `next/headers` — headers() for session lookup
 *  2. `@/core/auth` — auth.api.getSession(...)
 *  3. `@/modules/dashboard/data/get-organization-id` — getOrganizationId()
 *  4. `@/modules/analytics/data/analytics-data` — all 10 data functions
 *
 * RBAC paths (ANA-002, ANA-004):
 *  - ADMIN: full org data, optional professionalUserId filter
 *  - SECRETARY: full org data, same as ADMIN
 *  - PROFESSIONAL: auto-injected professionalUserId, manual param ignored
 *  - PATIENT: blocked immediately, no DB queries
 *  - Unauthenticated: "No autorizado"
 *
 * Validation (ANA-001):
 *  - Custom range without from/to → error
 *  - from > to → error
 *
 * Error handling (ANA-003):
 *  - Data function throws → graceful "Database error: ..." response
 *
 * Spec: openspec/changes/analytics/specs/analytics-actions/spec.md
 * Design: openspec/changes/analytics/design.md — Action layer.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsQueryInput } from "../analytics-actions.types";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the import of the action under test.
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const ADMIN_USER_ID = "user-admin-001";
const PROFESSIONAL_USER_ID = "prof-123";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const getSessionMock = vi.fn();
vi.mock("@/core/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

const getOrganizationIdMock = vi.fn().mockResolvedValue(ORG_ID);
vi.mock("@/modules/dashboard/data/get-organization-id", () => ({
  getOrganizationId: getOrganizationIdMock,
}));

// Mock settings data (for maxBookingsPerDay in occupancy).
const getSettingsMock = vi.fn();
vi.mock("@/modules/settings/data/settings-data", () => ({
  getSettings: getSettingsMock,
}));

// Mock ALL 10 data functions.
const getRevenueMetricsMock = vi.fn();
const getBookingMetricsMock = vi.fn();
const getOccupancyMetricsMock = vi.fn();
const getPatientMetricsMock = vi.fn();
const getTopServicesMock = vi.fn();
const getTopProfessionalsMock = vi.fn();
const getPeakHoursMock = vi.fn();
const getDayDistributionMock = vi.fn();
const getDailyRevenueMock = vi.fn();
const getMonthlyRevenueMock = vi.fn();

vi.mock("@/modules/analytics/data/analytics-data", () => ({
  getRevenueMetrics: getRevenueMetricsMock,
  getBookingMetrics: getBookingMetricsMock,
  getOccupancyMetrics: getOccupancyMetricsMock,
  getPatientMetrics: getPatientMetricsMock,
  getTopServices: getTopServicesMock,
  getTopProfessionals: getTopProfessionalsMock,
  getPeakHours: getPeakHoursMock,
  getDayDistribution: getDayDistributionMock,
  getDailyRevenue: getDailyRevenueMock,
  getMonthlyRevenue: getMonthlyRevenueMock,
}));

// Import after mocks are in place.
const { getAnalyticsAction } = await import("../analytics-actions");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function sessionFor(
  role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT",
  userId?: string,
) {
  return { user: { id: userId ?? ADMIN_USER_ID, role } };
}

const mockRevenue = {
  total: 15000,
  averagePerBooking: 1500,
  dailyRevenue: [{ date: "2026-01-15", amount: 15000 }],
  monthlyRevenue: [{ month: "2026-01", amount: 15000 }],
};

const mockBookings = {
  total: 10,
  confirmed: 5,
  cancelled: 2,
  completed: 3,
  completionRate: 0.3,
};

const mockOccupancy = {
  occupiedSlots: 8,
  totalSlots: 20,
  rate: 0.4,
};

const mockPatients = {
  newPatients: 4,
  returningPatients: 6,
  totalUnique: 10,
};

const mockServices = [
  { serviceId: "svc-1", serviceName: "Consulta", count: 5, revenue: 7500 },
];

const mockProfessionals = [
  {
    professionalUserId: "prof-1",
    name: "Dr. Smith",
    count: 5,
    revenue: 7500,
    occupancyRate: 0,
  },
];

const mockPeakHours = [{ hour: 10, count: 5 }];
const mockDayDistribution = [{ dayOfWeek: 1, count: 5 }];

function mockAllDataFunctions() {
  getRevenueMetricsMock.mockResolvedValue(mockRevenue);
  getBookingMetricsMock.mockResolvedValue(mockBookings);
  getOccupancyMetricsMock.mockResolvedValue(mockOccupancy);
  getPatientMetricsMock.mockResolvedValue(mockPatients);
  getTopServicesMock.mockResolvedValue(mockServices);
  getTopProfessionalsMock.mockResolvedValue(mockProfessionals);
  getPeakHoursMock.mockResolvedValue(mockPeakHours);
  getDayDistributionMock.mockResolvedValue(mockDayDistribution);
  getDailyRevenueMock.mockResolvedValue(mockRevenue.dailyRevenue);
  getMonthlyRevenueMock.mockResolvedValue(mockRevenue.monthlyRevenue);
  getSettingsMock.mockResolvedValue({ maxBookingsPerDay: 50 });
}

const validInput = {
  dateRange: { preset: "7d" as const },
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("getAnalyticsAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // =========================================================================
  // ADMIN — full org access
  // =========================================================================

  describe("ADMIN role", () => {
    it("returns all metrics with org-wide data when no professionalUserId", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
      mockAllDataFunctions();

      const result = await getAnalyticsAction(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.revenue).toEqual(mockRevenue);
        expect(result.data.bookings).toEqual(mockBookings);
        expect(result.data.occupancy).toEqual(mockOccupancy);
        expect(result.data.patients).toEqual(mockPatients);
        expect(result.data.topServices).toEqual(mockServices);
        expect(result.data.topProfessionals).toEqual(mockProfessionals);
        expect(result.data.peakHours).toEqual(mockPeakHours);
        expect(result.data.dayDistribution).toEqual(mockDayDistribution);
      }
    });

    it("filters by professionalUserId when provided", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
      mockAllDataFunctions();

      await getAnalyticsAction({
        dateRange: { preset: "30d" },
        professionalUserId: "prof-filter",
      });

      // Verify all data functions received the professionalUserId filter.
      expect(getRevenueMetricsMock).toHaveBeenCalledWith(
        ORG_ID,
        { preset: "30d" },
        "prof-filter",
      );
      expect(getBookingMetricsMock).toHaveBeenCalledWith(
        ORG_ID,
        { preset: "30d" },
        "prof-filter",
      );
    });

    it("passes undefined professionalUserId when not provided (org-wide)", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
      mockAllDataFunctions();

      await getAnalyticsAction(validInput);

      expect(getRevenueMetricsMock).toHaveBeenCalledWith(
        ORG_ID,
        validInput.dateRange,
        undefined,
      );
    });
  });

  // =========================================================================
  // SECRETARY — same as ADMIN
  // =========================================================================

  describe("SECRETARY role", () => {
    it("returns full org data, same access as ADMIN", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));
      mockAllDataFunctions();

      const result = await getAnalyticsAction(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.revenue.total).toBe(15000);
        expect(result.data.bookings.total).toBe(10);
      }
    });

    it("accepts optional professionalUserId filter", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));
      mockAllDataFunctions();

      await getAnalyticsAction({
        dateRange: { preset: "30d" },
        professionalUserId: "prof-x",
      });

      expect(getRevenueMetricsMock).toHaveBeenCalledWith(
        ORG_ID,
        { preset: "30d" },
        "prof-x",
      );
    });
  });

  // =========================================================================
  // PROFESSIONAL — auto-scoped, manual param ignored
  // =========================================================================

  describe("PROFESSIONAL role", () => {
    it("auto-injects professionalUserId from session", async () => {
      getSessionMock.mockResolvedValueOnce(
        sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
      );
      mockAllDataFunctions();

      const result = await getAnalyticsAction(validInput);

      expect(result.success).toBe(true);
      // All data functions must receive the session user's ID.
      expect(getRevenueMetricsMock).toHaveBeenCalledWith(
        ORG_ID,
        validInput.dateRange,
        PROFESSIONAL_USER_ID,
      );
      expect(getBookingMetricsMock).toHaveBeenCalledWith(
        ORG_ID,
        validInput.dateRange,
        PROFESSIONAL_USER_ID,
      );
      expect(getOccupancyMetricsMock).toHaveBeenCalledWith(
        ORG_ID,
        validInput.dateRange,
        50, // maxBookingsPerDay from settings
        PROFESSIONAL_USER_ID,
      );
    });

    it("ignores manually passed professionalUserId (defense-in-depth)", async () => {
      getSessionMock.mockResolvedValueOnce(
        sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
      );
      mockAllDataFunctions();

      await getAnalyticsAction({
        dateRange: { preset: "7d" },
        professionalUserId: "attacker-injected-id",
      });

      // Must use session ID, NOT the manually passed one.
      expect(getRevenueMetricsMock).toHaveBeenCalledWith(
        ORG_ID,
        { preset: "7d" },
        PROFESSIONAL_USER_ID, // session ID wins
      );
    });
  });

  // =========================================================================
  // PATIENT — blocked
  // =========================================================================

  describe("PATIENT role", () => {
    it("returns error immediately without calling data functions", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

      const result = await getAnalyticsAction(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("No autorizado");
      }
      // No DB queries must be executed.
      expect(getRevenueMetricsMock).not.toHaveBeenCalled();
      expect(getBookingMetricsMock).not.toHaveBeenCalled();
      expect(getOccupancyMetricsMock).not.toHaveBeenCalled();
      expect(getPatientMetricsMock).not.toHaveBeenCalled();
      expect(getTopServicesMock).not.toHaveBeenCalled();
      expect(getTopProfessionalsMock).not.toHaveBeenCalled();
      expect(getPeakHoursMock).not.toHaveBeenCalled();
      expect(getDayDistributionMock).not.toHaveBeenCalled();
    });

    it("blocks even with valid date range input", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

      const result = await getAnalyticsAction({
        dateRange: { preset: "7d" },
        professionalUserId: "some-id",
      });

      expect(result.success).toBe(false);
      expect(getOrganizationIdMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Unauthenticated — no session
  // =========================================================================

  describe("unauthenticated", () => {
    it("returns 'No autorizado' when session is null", async () => {
      getSessionMock.mockResolvedValueOnce(null);

      const result = await getAnalyticsAction(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("No autorizado");
      }
      expect(getRevenueMetricsMock).not.toHaveBeenCalled();
    });

    it("returns 'No autorizado' when session has no user", async () => {
      getSessionMock.mockResolvedValueOnce({ user: null });

      const result = await getAnalyticsAction(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("No autorizado");
      }
    });
  });

  // =========================================================================
  // Zod validation
  // =========================================================================

  describe("Zod validation", () => {
    it("rejects custom dateRange without from/to", async () => {
      const result = await getAnalyticsAction({
        dateRange: { preset: "custom" },
      } as unknown as AnalyticsQueryInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("from");
      }
      // Must not reach auth or data layers.
      expect(getSessionMock).not.toHaveBeenCalled();
      expect(getRevenueMetricsMock).not.toHaveBeenCalled();
    });

    it("rejects custom dateRange where from > to", async () => {
      const result = await getAnalyticsAction({
        dateRange: {
          preset: "custom",
          from: new Date("2026-02-01"),
          to: new Date("2026-01-01"),
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("from");
      }
      expect(getSessionMock).not.toHaveBeenCalled();
    });

    it("accepts valid custom dateRange", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
      mockAllDataFunctions();

      const result = await getAnalyticsAction({
        dateRange: {
          preset: "custom",
          from: new Date("2026-01-01"),
          to: new Date("2026-01-31"),
        },
      });

      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Error handling — Prisma/data layer errors
  // =========================================================================

  describe("error handling", () => {
    it("returns graceful error when data function throws", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
      getOrganizationIdMock.mockResolvedValueOnce(ORG_ID);
      getRevenueMetricsMock.mockRejectedValueOnce(
        new Error("Connection refused"),
      );

      const result = await getAnalyticsAction(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Database error");
        // Must NOT expose stack traces.
        expect(result.error).not.toContain("Connection refused");
        expect(result.error).not.toContain("at ");
      }
    });

    it("returns graceful error when getOrganizationId throws", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
      getOrganizationIdMock.mockRejectedValueOnce(
        new Error("No organization found"),
      );

      const result = await getAnalyticsAction(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Database error");
      }
    });
  });

  // =========================================================================
  // Data function orchestration
  // =========================================================================

  describe("data function orchestration", () => {
    it("calls getOrganizationId to resolve tenant", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
      mockAllDataFunctions();

      await getAnalyticsAction(validInput);

      expect(getOrganizationIdMock).toHaveBeenCalledOnce();
    });

    it("calls getSettings to resolve maxBookingsPerDay for occupancy", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
      mockAllDataFunctions();

      await getAnalyticsAction(validInput);

      expect(getSettingsMock).toHaveBeenCalledWith(ORG_ID);
    });

    it("uses default maxBookingsPerDay (50) when getSettings returns null", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
      mockAllDataFunctions();
      getSettingsMock.mockResolvedValueOnce(null);

      await getAnalyticsAction(validInput);

      expect(getOccupancyMetricsMock).toHaveBeenCalledWith(
        ORG_ID,
        validInput.dateRange,
        50, // default from SETTINGS_DEFAULTS
        undefined,
      );
    });

    it("calls all 8 data functions (not daily/monthly revenue separately)", async () => {
      getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
      mockAllDataFunctions();

      await getAnalyticsAction(validInput);

      expect(getRevenueMetricsMock).toHaveBeenCalledOnce();
      expect(getBookingMetricsMock).toHaveBeenCalledOnce();
      expect(getOccupancyMetricsMock).toHaveBeenCalledOnce();
      expect(getPatientMetricsMock).toHaveBeenCalledOnce();
      expect(getTopServicesMock).toHaveBeenCalledOnce();
      expect(getTopProfessionalsMock).toHaveBeenCalledOnce();
      expect(getPeakHoursMock).toHaveBeenCalledOnce();
      expect(getDayDistributionMock).toHaveBeenCalledOnce();
    });
  });
});
