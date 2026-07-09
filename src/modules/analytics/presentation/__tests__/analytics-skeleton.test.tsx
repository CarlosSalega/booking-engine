/**
 * Tests for AnalyticsSkeleton — loading fallback for the analytics page.
 *
 * Verifies the skeleton renders the expected number of placeholder
 * elements (KPI cards, chart areas) so the user sees a stable layout
 * while data streams in.
 *
 * Spec: ANP-001 (loading state), ANP-003 (KPI skeleton).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalyticsSkeleton } from "../analytics-skeleton";

describe("AnalyticsSkeleton", () => {
  it("renders 4 KPI card skeletons", () => {
    render(<AnalyticsSkeleton />);

    const kpiSkeletons = screen.getAllByTestId("kpi-skeleton");
    expect(kpiSkeletons).toHaveLength(4);
  });

  it("renders chart placeholder skeletons", () => {
    render(<AnalyticsSkeleton />);

    const chartSkeletons = screen.getAllByTestId("chart-skeleton");
    expect(chartSkeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders with accessible role for loading state", () => {
    render(<AnalyticsSkeleton />);

    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
  });
});
