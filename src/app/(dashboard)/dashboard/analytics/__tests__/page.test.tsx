/**
 * Tests for the `/dashboard/analytics` route entry (page.tsx).
 *
 * The route is a thin Server Component that composes:
 *   1. Page header — "Analíticas" heading + description.
 *   2. `<Suspense>` with `<AnalyticsSkeleton>` fallback.
 *   3. `<AnalyticsPage>` — the data-dependent body (imported from
 *      `@/modules/analytics/presentation/analytics-page`).
 *
 * This test focuses on the ROUTE's own contract:
 *  - The header renders the "Analíticas" heading.
 *  - The route's default export wires the header + skeleton +
 *    body together.
 *
 * The body itself (data flow, charts, KPIs) is covered by
 * `src/modules/analytics/presentation/__tests__/analytics-page.test.tsx`.
 * Here we mock the body so this test stays focused on the route
 * shell.
 *
 * Spec source: `openspec/changes/analytics/specs/analytics-presentation/spec.md`
 *   - ANP-001: Analytics Page — route entry + Suspense boundary
 */

import "temporal-polyfill/global";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock the body so this test never imports the real analytics page
// (which calls getAnalyticsAction and needs a full Prisma context).
// The body's contract is covered by analytics-page.test.tsx.
vi.mock("@/modules/analytics/presentation/analytics-page", () => ({
  AnalyticsPage: () => <div data-testid="analytics-page-body" />,
}));

const { default: AnalyticsRoute } = await import("../page");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/dashboard/analytics — route entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the 'Analíticas' heading in the page header", () => {
    render(<AnalyticsRoute />);
    expect(
      screen.getByRole("heading", { name: /analíticas/i }),
    ).toBeInTheDocument();
  });

  it("renders the description text under the heading", () => {
    render(<AnalyticsRoute />);
    expect(
      screen.getByText(/métricas de ingresos, reservas y ocupación/i),
    ).toBeInTheDocument();
  });

  it("renders the analytics page body inside the Suspense boundary", () => {
    render(<AnalyticsRoute />);
    expect(screen.getByTestId("analytics-page-body")).toBeInTheDocument();
  });
});
