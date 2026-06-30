/**
 * Tests for the `/dashboard/settings` Server Component page.
 *
 * The page is the entry point for the settings feature. It:
 *  1. Resolves the org via `getOrganizationId()`.
 *  2. Reads the settings row via `getSettings(orgId)` (cached — the
 *     `"use cache"` wrapper from PR #2).
 *  3. Renders the settings UI inside `<SettingsGuard>` so the Client
 *     Component can gate per-role access.
 *  4. The guard is given a function-as-children pattern that receives
 *     `readOnly`; the page renders the three tabs (Negocio,
 *     Reservas, Cancelaciones) inside that callback.
 *
 * Mocking strategy:
 *  - `getOrganizationId` + `getSettings` are mocked at the data layer
 *    so the test never hits Prisma.
 *  - `SettingsGuard` is mocked as a thin proxy that calls its
 *    children callback with a fixed `readOnly` flag. This isolates
 *    the page test from the guard's RBAC logic (which is covered by
 *    `settings-guard.test.tsx`).
 *  - The Tabs components are real — we assert on the trigger labels
 *    in Argentinian Spanish and the three tab contents.
 *
 * The page is a Server Component, but vitest renders it as a normal
 * React tree (RSC-specific features like `"use cache"` are no-ops
 * in the test env). The tabs are Client Components (Radix), but
 * `@radix-ui` ships ESM that vitest can render in jsdom.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Tabbed Settings Page
 *     - Scenario: Admin visits settings
 *   - Requirement: Client Guard
 *     - Scenario: Admin passes guard
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

const getOrganizationIdMock = vi.fn();
vi.mock("@/modules/dashboard/data/get-organization-id", () => ({
  getOrganizationId: getOrganizationIdMock,
}));

const getSettingsMock = vi.fn();
vi.mock("@/modules/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/settings")>();
  return {
    ...actual,
    getSettings: getSettingsMock,
  };
});

// Mock the SettingsGuard so the page test focuses on the page's
// own contract (tab structure, Suspense, cached data). The guard's
// RBAC routing is covered by settings-guard.test.tsx.
vi.mock("@/modules/settings/presentation/settings-guard", () => ({
  SettingsGuard: ({
    children,
  }: {
    children: (readOnly: boolean) => React.ReactNode;
  }) => <>{children(false)}</>,
}));

const { SettingsBody, SettingsHeader } = await import("../page");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";

const baseSettings = {
  id: "00000000-0000-4000-8000-0000000000a1",
  organizationId: ORG_ID,
  name: "Clínica Demo",
  description: "Atención integral",
  address: "Av. Siempre Viva 742",
  timezone: "America/Argentina/Buenos_Aires",
  phone: "+5491144440000",
  email: "demo@clinica.test",
  defaultDurationMinutes: 30,
  minAdvanceBookingHours: 1,
  maxBookingsPerDay: 50,
  bufferMinutes: 0,
  cancellationEnabled: true,
  cancellationLimitHours: 24,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/dashboard/settings — page", () => {
  beforeEach(() => {
    getOrganizationIdMock.mockReset();
    getSettingsMock.mockReset();
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
    getSettingsMock.mockResolvedValue(baseSettings);
  });

  afterEach(() => {
    cleanup();
  });

  it("resolves the org id via getOrganizationId() and reads cached settings", async () => {
    const body = await SettingsBody();
    render(body);
    expect(getOrganizationIdMock).toHaveBeenCalledTimes(1);
    expect(getSettingsMock).toHaveBeenCalledWith(ORG_ID);
  });

  it("wraps the tab content in <SettingsGuard>", async () => {
    const body = await SettingsBody();
    render(body);
    // The mocked guard renders its children with readOnly=false;
    // we verify the guard ran by checking that the tabs (its
    // children) are visible in the DOM.
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders three tabs with Argentinian Spanish labels (Negocio, Reservas, Cancelaciones)", async () => {
    const body = await SettingsBody();
    render(body);
    expect(
      screen.getByRole("tab", { name: /negocio/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /reservas/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /cancelaciones/i }),
    ).toBeInTheDocument();
  });

  it("shows the Configuración heading (page header)", () => {
    // The header is the static part of the tree (pre-rendered in PPR)
    // — renderable synchronously without the data layer.
    render(<SettingsHeader />);
    expect(
      screen.getByRole("heading", { name: /configuración/i }),
    ).toBeInTheDocument();
  });
});
