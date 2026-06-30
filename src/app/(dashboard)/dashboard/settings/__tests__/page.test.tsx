/**
 * Tests for the `/dashboard/settings` route entry (page.tsx).
 *
 * The route is a thin Server Component that composes:
 *   1. `<SettingsHeader>` — static page header (title + back link).
 *   2. `<Suspense>` with `<SettingsSkeleton>` fallback.
 *   3. `<SettingsPage>` — the data-dependent body (imported from
 *      `@/modules/settings/presentation/settings-page`).
 *
 * This test focuses on the ROUTE's own contract:
 *  - The header renders the "Configuración" heading (static).
 *  - The route's default export wires the header + skeleton +
 *    body together.
 *
 * The body itself (data flow, tab structure, banner) is covered
 * by `src/modules/settings/presentation/__tests__/settings-page.test.tsx`.
 * Here we mock the body so this test stays focused on the route
 * shell and never imports the real tab forms (which require a
 * Next router in jsdom).
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Tabbed Settings Page → Scenario: Admin visits settings
 *   - Requirement: Client Guard → Scenario: Admin passes guard
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

// Mock the body so this test never imports the real tab forms
// (which use useRouter + useTransition and need a Next app
// router mounted in jsdom). The body's contract is covered by
// `settings-page.test.tsx`.
vi.mock("@/modules/settings/presentation/settings-page", () => ({
  SettingsPage: () => <div data-testid="settings-page-body" />,
}));

const { SettingsHeader, default: SettingsRoute } = await import("../page");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/dashboard/settings — route entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the 'Configuración' heading in the page header", () => {
    render(<SettingsHeader />);
    expect(
      screen.getByRole("heading", { name: /configuración/i }),
    ).toBeInTheDocument();
  });

  it("renders the page header + body in the default route export", () => {
    // The default export is a Server Component that wraps
    // SettingsPage in <Suspense>. Render the tree synchronously —
    // the mock body resolves immediately, no suspend.
    render(<SettingsRoute />);
    expect(
      screen.getByRole("heading", { name: /configuración/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("settings-page-body")).toBeInTheDocument();
  });
});
