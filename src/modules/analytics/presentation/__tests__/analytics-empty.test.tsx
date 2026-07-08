/**
 * Tests for AnalyticsEmpty — empty state for no-data ranges.
 *
 * Verifies the component renders a user-friendly message when all
 * metrics are zero/empty for the selected date range.
 *
 * Spec: ANP-009 (empty state).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalyticsEmpty } from "../analytics-empty";

describe("AnalyticsEmpty", () => {
  it("renders the empty state message in Spanish", () => {
    render(<AnalyticsEmpty />);

    expect(
      screen.getByText("No hay datos disponibles para este período."),
    ).toBeInTheDocument();
  });

  it("renders an illustration or icon placeholder", () => {
    render(<AnalyticsEmpty />);

    expect(screen.getByTestId("analytics-empty-icon")).toBeInTheDocument();
  });
});
