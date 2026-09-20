/**
 * Tests for the `SiteHeader` Server Component — breadcrumb wiring.
 *
 * The header must render the route-derived `<DashboardBreadcrumbs />`
 * when no `crumbs` prop is passed (the dashboard layout never passes
 * one) and must preserve the explicit `crumbs` path for callers that
 * still pass static trails.
 *
 * Server-component invariant: `SiteHeader` itself does NOT carry
 * `"use client"`. The breadcrumb client island is embedded inside the
 * server-rendered header. We pin the invariant by reading the source
 * file so any future regression that promotes `SiteHeader` to a client
 * component fails the test before it lands.
 *
 * Mocking strategy:
 *  - `next/navigation.usePathname` → controlled return (the breadcrumb
 *    client component reads it)
 *  - `window.matchMedia` stub for `SidebarProvider` (same pattern as
 *    `sidebar.test.tsx`)
 *
 * Spec source: openspec/changes/ux-audit-fixes/specs/dashboard-shell/spec.md
 *   - Requirement: Breadcrumb Client Isolation
 *   - Requirement: Route-Derived Breadcrumbs
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";

import { usePathname } from "next/navigation";

import { SiteHeader } from "../site-header";
import { SidebarProvider } from "@/components/ui/sidebar";

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const usePathnameMock = vi.mocked(usePathname);

function renderHeader(props: React.ComponentProps<typeof SiteHeader> = {}) {
  return render(
    <SidebarProvider>
      <SiteHeader {...props} />
    </SidebarProvider>,
  );
}

function breadcrumbNav() {
  return screen.getByLabelText("breadcrumb");
}

describe("SiteHeader — breadcrumb wiring", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it("renders the route-derived trail when no `crumbs` prop is passed", () => {
    usePathnameMock.mockReturnValue("/dashboard/bookings");

    renderHeader();

    const nav = breadcrumbNav();
    expect(within(nav).getByText("Dashboard")).toHaveAttribute(
      "href",
      "/dashboard",
    );
    // Current leaf carries aria-current="page" and aria-disabled="true"
    // via the shadcn BreadcrumbPage; assert the leaf text + current state.
    const current = within(nav).getByRole("link", {
      name: /turnos/i,
      current: "page",
    });
    expect(current).toHaveTextContent("Turnos");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders the route-derived trail at /dashboard/bookings/abc-123 with 'Detalle' as the leaf", () => {
    usePathnameMock.mockReturnValue("/dashboard/bookings/abc-123");

    renderHeader();

    const nav = breadcrumbNav();
    expect(within(nav).getByText("Dashboard")).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(within(nav).getByText("Turnos")).toHaveAttribute(
      "href",
      "/dashboard/bookings",
    );
    expect(
      within(nav).getByRole("link", { name: /./i, current: "page" }),
    ).toHaveTextContent("Detalle");
  });

  it("preserves the explicit `crumbs` prop path — does NOT fall back to usePathname", () => {
    // Mock a path that would otherwise produce a different trail; if the
    // header respected usePathname here, the assertion would fail.
    usePathnameMock.mockReturnValue("/dashboard/bookings");

    renderHeader({
      crumbs: [
        { label: "Inicio", href: "/" },
        { label: "Agenda", href: "/agenda" },
        { label: "Página actual" },
      ],
    });

    const nav = breadcrumbNav();
    expect(within(nav).getByText("Inicio")).toHaveAttribute("href", "/");
    expect(within(nav).getByText("Agenda")).toHaveAttribute("href", "/agenda");
    // The explicit last crumb is the current leaf, NOT "Turnos".
    const current = within(nav).getByRole("link", {
      name: /página actual/i,
      current: "page",
    });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByText("Turnos")).not.toBeInTheDocument();
  });
});

describe("SiteHeader — server-component invariant", () => {
  it("is implemented as a Server Component (no 'use client' directive in source)", () => {
    // Pin the boundary so any future PR that promotes SiteHeader to a
    // client component (and drags the sidebar trigger + separators into
    // the client bundle) fails the suite before merge.
    const source = readFileSync(
      resolve(process.cwd(), "src/components/dashboard/site-header.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/['"]use client['"]/);
  });
});
