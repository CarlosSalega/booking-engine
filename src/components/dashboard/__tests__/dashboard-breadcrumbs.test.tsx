/**
 * Tests for the `DashboardBreadcrumbs` Client Component.
 *
 * Spec source: openspec/changes/ux-audit-fixes/specs/dashboard-shell/spec.md
 *   - Requirement: Route-Derived Breadcrumbs
 *   - Requirement: Breadcrumb Client Isolation
 *   - Scenarios: Dashboard home, Bookings list, Booking detail,
 *     Calendar route, Unknown segment fallback.
 *
 * Mocking: `next/navigation.usePathname` is mocked to a controlled
 * return; `next/link` is left unmocked — the shadcn `BreadcrumbLink`
 * renders a real `<a href>` and jsdom resolves it, so we can assert
 * the href directly.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { usePathname } from "next/navigation";

import { buildTrail, resolveSegmentLabel } from "../dashboard-breadcrumbs";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const { DashboardBreadcrumbs } = await import("../dashboard-breadcrumbs");

const usePathnameMock = vi.mocked(usePathname);

function renderBreadcrumbs() {
  render(<DashboardBreadcrumbs />);
  return screen.getByLabelText("breadcrumb");
}

// Listitems inside the breadcrumb nav, excluding separators
// (`aria-hidden="true"` separators carry `role="presentation"`).
function items(nav: HTMLElement) {
  return within(nav)
    .getAllByRole("listitem")
    .filter((li) => li.getAttribute("aria-hidden") !== "true");
}

function leaf(nav: HTMLElement): HTMLElement {
  return within(nav).getByRole("link", { name: /./i, current: "page" });
}

describe("DashboardBreadcrumbs — route-derived trail", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it("renders 'Dashboard' as the non-linked leaf at /dashboard", () => {
    usePathnameMock.mockReturnValue("/dashboard");

    const nav = renderBreadcrumbs();
    expect(items(nav)).toHaveLength(1);

    // `BreadcrumbPage` exposes `role="link"` + `aria-disabled="true"`
    // for the current page; assert there is NO real clickable anchor.
    const anchors = screen
      .queryAllByRole("link", { name: /dashboard/i })
      .filter((el) => el.tagName === "A");
    expect(anchors).toHaveLength(0);

    const current = leaf(nav);
    expect(current).toHaveTextContent("Dashboard");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders 'Dashboard' link → 'Turnos' leaf at /dashboard/bookings", () => {
    usePathnameMock.mockReturnValue("/dashboard/bookings");

    const nav = renderBreadcrumbs();
    expect(items(nav)).toHaveLength(2);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(leaf(nav)).toHaveTextContent("Turnos");
  });

  it("renders Dashboard → Turnos → Detalle at /dashboard/bookings/abc-123", () => {
    usePathnameMock.mockReturnValue("/dashboard/bookings/abc-123");

    const nav = renderBreadcrumbs();
    expect(items(nav)).toHaveLength(3);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /turnos/i })).toHaveAttribute(
      "href",
      "/dashboard/bookings",
    );
    expect(leaf(nav)).toHaveTextContent("Detalle");

    // Dynamic id must NOT leak into the trail as a real anchor.
    const idAnchors = screen
      .queryAllByRole("link", { name: /abc-123/i })
      .filter((el) => el.tagName === "A");
    expect(idAnchors).toHaveLength(0);
  });

  it("renders Dashboard → Calendario at /dashboard/calendar", () => {
    usePathnameMock.mockReturnValue("/dashboard/calendar");

    const nav = renderBreadcrumbs();
    expect(items(nav)).toHaveLength(2);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(leaf(nav)).toHaveTextContent("Calendario");
  });

  it("falls back to raw text for an unmapped segment under /dashboard", () => {
    usePathnameMock.mockReturnValue("/dashboard/unknown-section");

    const nav = renderBreadcrumbs();
    expect(items(nav)).toHaveLength(2);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(leaf(nav)).toHaveTextContent("unknown-section");
  });

  it("links intermediate unmapped segments so a deep unmapped trail stays walkable", () => {
    usePathnameMock.mockReturnValue("/dashboard/foo/bar/baz");

    const nav = renderBreadcrumbs();
    expect(items(nav)).toHaveLength(4);

    expect(screen.getByRole("link", { name: /foo/i })).toHaveAttribute(
      "href",
      "/dashboard/foo",
    );
    expect(screen.getByRole("link", { name: /bar/i })).toHaveAttribute(
      "href",
      "/dashboard/foo/bar",
    );
    expect(leaf(nav)).toHaveTextContent("baz");
  });
});

describe("resolveSegmentLabel — pure mapping", () => {
  it("returns the es-AR label for a known segment", () => {
    expect(resolveSegmentLabel("bookings", "dashboard")).toBe("Turnos");
    expect(resolveSegmentLabel("settings", "dashboard")).toBe("Configuración");
  });

  it("returns 'Detalle' for an unmapped segment under an entity container", () => {
    expect(resolveSegmentLabel("abc-123", "bookings")).toBe("Detalle");
    expect(resolveSegmentLabel("p-9", "patients")).toBe("Detalle");
  });

  it("returns the raw segment when no parent context matches", () => {
    expect(resolveSegmentLabel("unknown-section", "dashboard")).toBe(
      "unknown-section",
    );
    expect(resolveSegmentLabel("bar", "foo")).toBe("bar");
  });
});

describe("buildTrail — pure path splitter", () => {
  it("returns an empty trail for the root path", () => {
    expect(buildTrail("/")).toEqual([]);
  });

  it("marks the last entry as the leaf with cumulative hrefs", () => {
    expect(buildTrail("/dashboard/bookings/abc-123")).toEqual([
      { label: "Dashboard", href: "/dashboard", isLeaf: false },
      { label: "Turnos", href: "/dashboard/bookings", isLeaf: false },
      { label: "Detalle", href: "/dashboard/bookings/abc-123", isLeaf: true },
    ]);
  });
});
