/**
 * Tests for the `DashboardSidebar` Client Component — role-based
 * navigation visibility.
 *
 * The sidebar's nav config is `NAV_GROUPS` (private to the module);
 * each item declares the `roles` allowed to see it. We assert:
 *  - ADMIN sees the "Configuración" link
 *  - SECRETARY now sees the "Configuración" link (added in PR #3 to
 *    grant view-only access to settings)
 *  - PROFESSIONAL does NOT see the "Configuración" link
 *
 * Mocking strategy:
 *  - `next/navigation.usePathname` → controlled return
 *  - `@/modules/auth/hooks.useAuth` → stubbed logout (the sidebar
 *    calls it from the footer dropdown)
 *  - The sidebar's role is driven by the `user` prop, not the
 *    session, so we don't need a full Better Auth client mock.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: RBAC-Gated Views
 *   - Scenario: Secretary read-only (read access to settings UI)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// jsdom doesn't implement `window.matchMedia`; shadcn's `use-mobile`
// hook (used by SidebarProvider) requires it. Provide a stub that
// matches the contract used by the production code.
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
  usePathname: vi.fn().mockReturnValue("/dashboard"),
}));

const logoutMock = vi.fn();
vi.mock("@/modules/auth/hooks", () => ({
  useAuth: () => ({ logout: logoutMock }),
}));

const { DashboardSidebar } = await import("../sidebar");
const { SidebarProvider } = await import("@/components/ui/sidebar");
const { TooltipProvider } = await import("@/components/ui/tooltip");

const baseUser = {
  name: "Test User",
  email: "test@example.com",
};

function renderSidebar(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT") {
  return render(
    <TooltipProvider>
      <SidebarProvider>
        <DashboardSidebar user={{ ...baseUser, role }} />
      </SidebarProvider>
    </TooltipProvider>,
  );
}

describe("DashboardSidebar — Configuración visibility (settings RBAC)", () => {
  beforeEach(() => {
    logoutMock.mockReset();
  });

  it("shows the 'Configuración' link to ADMIN", () => {
    renderSidebar("ADMIN");
    const link = screen.getByRole("link", { name: /configuración/i });
    expect(link).toHaveAttribute("href", "/dashboard/settings");
  });

  it("shows the 'Configuración' link to SECRETARY (PR #3 grants view access)", () => {
    renderSidebar("SECRETARY");
    const link = screen.getByRole("link", { name: /configuración/i });
    expect(link).toHaveAttribute("href", "/dashboard/settings");
  });

  it("hides the 'Configuración' link from PROFESSIONAL", () => {
    renderSidebar("PROFESSIONAL");
    expect(
      screen.queryByRole("link", { name: /configuración/i }),
    ).not.toBeInTheDocument();
  });
});
