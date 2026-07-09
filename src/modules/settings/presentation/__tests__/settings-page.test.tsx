/**
 * Tests for the `SettingsPage` Server Component (RSC).
 *
 * `SettingsPage` is the body of the `/dashboard/settings` route. It
 * lives in the presentation layer (per the design's module tree:
 * `presentation/settings-page.tsx`) so the route file in the App
 * Router (`app/(dashboard)/dashboard/settings/page.tsx`) stays a
 * thin wrapper that just composes Header + Suspense + Body.
 *
 * The RSC contract under test:
 *  1. Resolves the current `organizationId` via `getOrganizationId()`.
 *  2. Resolves the session server-side via `auth.api.getSession()`
 *     and derives `readOnly` from the user's role (ADMIN → false,
 *     SECRETARY → true, PROFESSIONAL → redirect).
 *  3. Reads the cached settings row via `getSettings(orgId)`.
 *  4. Renders three shadcn/ui `<Tabs />`: Negocio, Reservas,
 *     Cancelaciones.
 *  5. Shows a "View-only" banner when `readOnly=true` (SECRETARY)
 *     and does NOT show it when `readOnly=false` (ADMIN).
 *  6. Passes the cached settings + the `readOnly` flag down to
 *     each tab form (pre-fill + RBAC).
 *
 * Note on tab content mounting — shadcn/ui's `<TabsContent>` is
 * lazy: only the active tab's content is in the DOM. Tests that
 * need to assert on a non-default tab click the tab first
 * (Radix updates the active tab → the new content mounts).
 *
 * Mocking strategy:
 *  - `next/headers` → returns an empty Headers object.
 *  - `auth.api.getSession` → returns a per-test session with a
 *    configurable role (ADMIN = readOnly=false, SECRETARY =
 *    readOnly=true, PROFESSIONAL = redirect).
 *  - `next/navigation` `redirect` → captured via mock for assertion.
 *  - `getOrganizationId` + `getSettings` are mocked at the data
 *    layer so the test never hits Prisma / the real cache.
 *  - The three tab components are mocked as thin proxies — the
 *    page test focuses on the page's own contract (data flow,
 *    tab structure, banner). The forms' contracts are covered by
 *    `business-tab.test.tsx` / `bookings-tab.test.tsx` /
 *    `cancellations-tab.test.tsx`.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Tabbed Settings Page
 *     - Scenario: Admin visits settings
 *     - Scenario: Settings load from cache
 *   - Requirement: RBAC-Gated Views
 *     - Scenario: Secretary read-only
 *   - Requirement: Cancellations Tab → Scenario: Toggle enables hours field
 *     (pre-fill from cache)
 */

import "temporal-polyfill/global";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
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

// Module-level flag the test toggles to control the mock session
// role, which drives the `readOnly` flag in SettingsPage.
let mockSessionRole: string | undefined = "ADMIN";

const getSessionMock = vi.fn().mockImplementation(() => {
  if (!mockSessionRole) return Promise.resolve(null);
  return Promise.resolve({
    user: { role: mockSessionRole },
  });
});

vi.mock("@/core/auth/auth-instance", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

// The three tab forms are mocked as thin proxies so the test focuses
// on the page's own contract. The real forms have their own test
// files. Each proxy exposes the data it received as a DOM attribute
// for assertion.
vi.mock("@/modules/settings/presentation/tabs/business-tab", () => ({
  BusinessTab: ({
    settings,
    readOnly,
  }: {
    settings: unknown;
    readOnly: boolean;
  }) => (
    <div
      data-testid="tab-business-form"
      data-readonly={readOnly ? "true" : "false"}
      data-settings-name={
        (settings as { name?: string } | null)?.name ?? "__null__"
      }
    />
  ),
}));

vi.mock("@/modules/settings/presentation/tabs/bookings-tab", () => ({
  BookingsTab: ({
    settings,
    readOnly,
  }: {
    settings: unknown;
    readOnly: boolean;
  }) => (
    <div
      data-testid="tab-bookings-form"
      data-readonly={readOnly ? "true" : "false"}
      data-settings-duration={
        (settings as { defaultDurationMinutes?: number } | null)
          ?.defaultDurationMinutes ?? "__null__"
      }
    />
  ),
}));

vi.mock("@/modules/settings/presentation/tabs/cancellations-tab", () => ({
  CancellationsTab: ({
    settings,
    readOnly,
  }: {
    settings: unknown;
    readOnly: boolean;
  }) => (
    <div
      data-testid="tab-cancellations-form"
      data-readonly={readOnly ? "true" : "false"}
      data-settings-cancellation-enabled={
        (settings as { cancellationEnabled?: boolean } | null)
          ?.cancellationEnabled === undefined
          ? "__null__"
          : String(
              (settings as { cancellationEnabled: boolean })
                .cancellationEnabled,
            )
      }
    />
  ),
}));

const { SettingsPage } = await import("../settings-page");

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

async function renderPage() {
  const tree = await SettingsPage();
  render(tree);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SettingsPage — RSC body", () => {
  beforeEach(() => {
    getOrganizationIdMock.mockReset();
    getSettingsMock.mockReset();
    getSessionMock.mockClear();
    redirectMock.mockReset();
    mockSessionRole = "ADMIN";
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
    getSettingsMock.mockResolvedValue(baseSettings);
  });

  afterEach(() => {
    cleanup();
  });

  // -------------------------------------------------------------------------
  // Data flow
  // -------------------------------------------------------------------------

  it("resolves the org id via getOrganizationId() and reads cached settings", async () => {
    await renderPage();
    expect(getOrganizationIdMock).toHaveBeenCalledTimes(1);
    expect(getSettingsMock).toHaveBeenCalledWith(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Tab structure (triggers are always rendered)
  // -------------------------------------------------------------------------

  it("renders three tabs with Argentinian Spanish labels (Negocio, Reservas, Cancelaciones)", async () => {
    await renderPage();
    expect(screen.getByRole("tab", { name: /negocio/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /reservas/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /cancelaciones/i }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Read-only banner — RBAC visibility (per spec: Secretary read-only)
  // -------------------------------------------------------------------------

  it("does NOT show the 'View-only' banner when readOnly=false (ADMIN)", async () => {
    mockSessionRole = "ADMIN";
    await renderPage();
    expect(
      screen.queryByTestId("settings-readonly-banner"),
    ).not.toBeInTheDocument();
  });

  it("shows the 'View-only' banner when readOnly=true (SECRETARY)", async () => {
    mockSessionRole = "SECRETARY";
    await renderPage();
    const banner = screen.getByTestId("settings-readonly-banner");
    expect(banner).toBeInTheDocument();
    // Banner copy is in Argentinian Spanish.
    expect(banner.textContent?.toLowerCase()).toMatch(
      /s[oó]lo lectura|read.only|lectura/,
    );
  });

  it("places the read-only banner outside the TabsList (header zone)", async () => {
    mockSessionRole = "SECRETARY";
    await renderPage();
    const banner = screen.getByTestId("settings-readonly-banner");
    const tablist = screen.getByRole("tablist");
    // The banner is a sibling of the TabsList inside the same Tabs
    // root, but it is NOT inside the tablist itself.
    expect(
      tablist.contains(banner),
    ).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Pre-fill from cache (spec: "Settings load from cache")
  // The default tab is Negocio (business). Other tabs require a
  // user-click to mount (shadcn Tabs lazy-mounts TabsContent).
  // -------------------------------------------------------------------------

  it("passes the cached settings to the business tab (default tab)", async () => {
    await renderPage();
    const business = screen.getByTestId("tab-business-form");
    expect(business).toHaveAttribute("data-settings-name", "Clínica Demo");
  });

  it("passes the cached settings to the bookings tab (after switching tabs)", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole("tab", { name: /reservas/i }));
    const bookings = screen.getByTestId("tab-bookings-form");
    expect(bookings).toHaveAttribute("data-settings-duration", "30");
  });

  it("passes the cached settings to the cancellations tab (after switching tabs)", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole("tab", { name: /cancelaciones/i }));
    const cancellations = screen.getByTestId("tab-cancellations-form");
    expect(cancellations).toHaveAttribute(
      "data-settings-cancellation-enabled",
      "true",
    );
  });

  it("passes null to the active business tab when the cache returns null (greenfield)", async () => {
    getSettingsMock.mockResolvedValue(null);
    await renderPage();
    expect(
      screen.getByTestId("tab-business-form"),
    ).toHaveAttribute("data-settings-name", "__null__");
  });

  // -------------------------------------------------------------------------
  // readOnly propagation (RBAC for SECRETARY → all forms read-only)
  // -------------------------------------------------------------------------

  it("forwards readOnly=true to the business tab when SECRETARY", async () => {
    mockSessionRole = "SECRETARY";
    await renderPage();
    expect(
      screen.getByTestId("tab-business-form"),
    ).toHaveAttribute("data-readonly", "true");
  });

  it("forwards readOnly=true to the bookings tab when SECRETARY (after switching tabs)", async () => {
    const user = userEvent.setup();
    mockSessionRole = "SECRETARY";
    await renderPage();
    await user.click(screen.getByRole("tab", { name: /reservas/i }));
    expect(
      screen.getByTestId("tab-bookings-form"),
    ).toHaveAttribute("data-readonly", "true");
  });

  it("forwards readOnly=true to the cancellations tab when SECRETARY (after switching tabs)", async () => {
    const user = userEvent.setup();
    mockSessionRole = "SECRETARY";
    await renderPage();
    await user.click(screen.getByRole("tab", { name: /cancelaciones/i }));
    expect(
      screen.getByTestId("tab-cancellations-form"),
    ).toHaveAttribute("data-readonly", "true");
  });

  it("forwards readOnly=false to the business tab when ADMIN", async () => {
    mockSessionRole = "ADMIN";
    await renderPage();
    expect(
      screen.getByTestId("tab-business-form"),
    ).toHaveAttribute("data-readonly", "false");
  });

  // -------------------------------------------------------------------------
  // PROFESSIONAL redirect
  // -------------------------------------------------------------------------

  it("redirects PROFESSIONAL users to /dashboard", async () => {
    mockSessionRole = "PROFESSIONAL";
    await SettingsPage();
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });
});
