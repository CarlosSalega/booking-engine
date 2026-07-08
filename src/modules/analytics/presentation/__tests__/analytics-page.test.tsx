/**
 * Tests for AnalyticsPage — RSC body that renders all analytics children.
 *
 * Verifies the page renders KPI cards and handles empty/error states.
 * Mocks getAnalyticsAction to control the data flow.
 *
 * Spec: ANP-001 (analytics page), ANP-009 (empty state), ANP-010 (error state).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AnalyticsResponse } from "../../domain/types";

// ---------------------------------------------------------------------------
// Mock getAnalyticsAction — declared BEFORE importing the page component.
// ---------------------------------------------------------------------------

const mockGetAnalyticsAction = vi.fn();

vi.mock("../../actions/analytics-actions", () => ({
  getAnalyticsAction: (...args: unknown[]) => mockGetAnalyticsAction(...args),
}));

// Mock DateRangeFilter — it uses useRouter/useSearchParams (client hooks).
vi.mock("../date-range-filter", () => ({
  DateRangeFilter: () => <div data-testid="date-range-filter" />,
}));

// Mock chart wrappers — they use next/dynamic + Recharts (browser APIs).
vi.mock("../analytics-charts", () => ({
  RevenueChartClient: ({ data }: { data: unknown }) => (
    <div data-testid="revenue-chart" data-chart-data={JSON.stringify(data)} />
  ),
  BookingsChartClient: ({ data }: { data: unknown }) => (
    <div data-testid="bookings-chart" data-chart-data={JSON.stringify(data)} />
  ),
  OccupancyChartClient: ({ data }: { data: unknown }) => (
    <div data-testid="occupancy-chart" data-chart-data={JSON.stringify(data)} />
  ),
  TemporalChartsClient: ({ peakHours, dayDistribution }: { peakHours: unknown; dayDistribution: unknown }) => (
    <div data-testid="temporal-charts" data-peak={JSON.stringify(peakHours)} data-day={JSON.stringify(dayDistribution)} />
  ),
}));

// Mock list components — they import formatCurrency from dashboard.
vi.mock("../top-services", () => ({
  TopServices: ({ data }: { data: unknown }) => (
    <div data-testid="top-services" data-services={JSON.stringify(data)} />
  ),
}));

vi.mock("../top-professionals", () => ({
  TopProfessionals: ({ data }: { data: unknown }) => (
    <div data-testid="top-professionals" data-professionals={JSON.stringify(data)} />
  ),
}));

const { AnalyticsPage } = await import("../analytics-page");

// ---------------------------------------------------------------------------
// Test fixtures — full AnalyticsResponse with known values.
// ---------------------------------------------------------------------------

const fullData: AnalyticsResponse = {
  revenue: {
    total: 150000,
    averagePerBooking: 15000,
    dailyRevenue: [],
    monthlyRevenue: [],
  },
  bookings: {
    total: 10,
    confirmed: 6,
    cancelled: 2,
    completed: 2,
    completionRate: 0.2,
  },
  occupancy: {
    occupiedSlots: 12,
    totalSlots: 40,
    rate: 0.3,
  },
  patients: {
    newPatients: 5,
    returningPatients: 3,
    totalUnique: 8,
  },
  topServices: [],
  topProfessionals: [],
  peakHours: [],
  dayDistribution: [],
};

const emptyData: AnalyticsResponse = {
  revenue: { total: 0, averagePerBooking: 0, dailyRevenue: [], monthlyRevenue: [] },
  bookings: { total: 0, confirmed: 0, cancelled: 0, completed: 0, completionRate: 0 },
  occupancy: { occupiedSlots: 0, totalSlots: 0, rate: 0 },
  patients: { newPatients: 0, returningPatients: 0, totalUnique: 0 },
  topServices: [],
  topProfessionals: [],
  peakHours: [],
  dayDistribution: [],
};

// ---------------------------------------------------------------------------
// AnalyticsPage
// ---------------------------------------------------------------------------

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders KPI cards with data from getAnalyticsAction", async () => {
    mockGetAnalyticsAction.mockResolvedValueOnce({ success: true, data: fullData });

    render(await AnalyticsPage({ searchParams: { preset: "30d" } }));

    expect(screen.getByTestId("kpi-revenue")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-bookings")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-occupancy")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-patients")).toBeInTheDocument();
  });

  it("renders empty state when all metrics are zero", async () => {
    mockGetAnalyticsAction.mockResolvedValueOnce({ success: true, data: emptyData });

    render(await AnalyticsPage({ searchParams: { preset: "30d" } }));

    expect(screen.getByTestId("analytics-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("kpi-revenue")).not.toBeInTheDocument();
  });

  it("renders error state when action returns failure", async () => {
    mockGetAnalyticsAction.mockResolvedValueOnce({
      success: false,
      error: "Database error: failed to fetch analytics",
    });

    render(await AnalyticsPage({ searchParams: { preset: "30d" } }));

    expect(screen.getByTestId("analytics-error")).toBeInTheDocument();
    expect(screen.queryByTestId("kpi-revenue")).not.toBeInTheDocument();
  });

  it("renders DateRangeFilter component", async () => {
    mockGetAnalyticsAction.mockResolvedValueOnce({ success: true, data: fullData });

    render(await AnalyticsPage({ searchParams: { preset: "30d" } }));

    expect(screen.getByTestId("date-range-filter")).toBeInTheDocument();
  });

  it("passes dateRange from searchParams to action", async () => {
    mockGetAnalyticsAction.mockResolvedValueOnce({ success: true, data: fullData });

    await AnalyticsPage({ searchParams: { preset: "7d" } });

    expect(mockGetAnalyticsAction).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRange: { preset: "7d" },
      }),
    );
  });

  it("renders chart components with data", async () => {
    mockGetAnalyticsAction.mockResolvedValueOnce({ success: true, data: fullData });

    render(await AnalyticsPage({ searchParams: { preset: "30d" } }));

    expect(screen.getByTestId("revenue-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bookings-chart")).toBeInTheDocument();
    expect(screen.getByTestId("occupancy-chart")).toBeInTheDocument();
  });

  it("renders top lists and temporal charts with data", async () => {
    mockGetAnalyticsAction.mockResolvedValueOnce({ success: true, data: fullData });

    render(await AnalyticsPage({ searchParams: { preset: "30d" } }));

    expect(screen.getByTestId("top-services")).toBeInTheDocument();
    expect(screen.getByTestId("top-professionals")).toBeInTheDocument();
    expect(screen.getByTestId("temporal-charts")).toBeInTheDocument();
  });
});
