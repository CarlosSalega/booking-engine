/**
 * Tests for AnalyticsError — error boundary fallback with retry.
 *
 * Verifies the component renders an error message and a retry button
 * that triggers the provided callback.
 *
 * Spec: ANP-010 (error state).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AnalyticsError } from "../analytics-error";

describe("AnalyticsError", () => {
  it("renders the error message in Spanish", () => {
    render(<AnalyticsError onRetry={vi.fn()} />);

    expect(
      screen.getByText("Error al cargar las analíticas. Intentá de nuevo."),
    ).toBeInTheDocument();
  });

  it("renders a retry button", () => {
    render(<AnalyticsError onRetry={vi.fn()} />);

    const button = screen.getByRole("button", { name: /reintentar/i });
    expect(button).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<AnalyticsError onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders an error icon", () => {
    render(<AnalyticsError onRetry={vi.fn()} />);

    expect(screen.getByTestId("analytics-error-icon")).toBeInTheDocument();
  });
});
