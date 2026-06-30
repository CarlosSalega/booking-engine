/**
 * Tests for the `SettingsGuard` Client Component.
 *
 * The guard wraps the settings UI and enforces per-role access:
 *  - ADMIN:         renders children with `readOnly=false` (pass-through)
 *  - SECRETARY:     renders children with `readOnly=true` (read-only)
 *  - PROFESSIONAL:  redirects to `/dashboard` (no children rendered)
 *  - Unauthenticated (no session): lets the layout handle it —
 *      renders nothing (no redirect, no children). The dashboard
 *      layout already redirects unauthenticated users to `/login`,
 *      so duplicating the redirect here would race.
 *
 * The guard uses a function-as-children pattern so the rendered
 * children can read the `readOnly` flag directly. The tests assert
 * the flag value via a tiny `Probe` component that exposes it as
 * a `data-readonly` attribute on the DOM.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: RBAC-Gated Views
 *     - Scenario: Secretary read-only
 *     - Scenario: Professional blocked
 *     - Scenario: Unauthenticated blocked
 *   - Requirement: Client Guard
 *     - Scenario: Admin passes guard
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the guard import
// ---------------------------------------------------------------------------

// `redirect()` in production throws a NEXT_REDIRECT sentinel that
// Next.js intercepts. The mock mirrors that contract so the test
// catches the abort — except in the helper, where we swallow the
// throw and assert the call was made.
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

// useSession returns Better Auth's reactive session atom. We control
// the returned value per test through this mock function.
const useSessionMock = vi.fn();

vi.mock("@/modules/auth/hooks/use-session", () => ({
  useSession: useSessionMock,
}));

const toastErrorMock = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { error: toastErrorMock }),
}));

const { SettingsGuard } = await import("../settings-guard");

// ---------------------------------------------------------------------------
// Test probe — exposes `readOnly` to the test as a data attribute
// ---------------------------------------------------------------------------

function Probe({ readOnly }: { readOnly: boolean }) {
  return (
    <div
      data-testid="probe"
      data-readonly={readOnly ? "true" : "false"}
    />
  );
}

function makeSession(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT") {
  return { data: { user: { id: "u-1", role } }, isPending: false };
}

// In production, `redirect()` throws a NEXT_REDIRECT sentinel that
// Next.js intercepts. In tests, we don't want the throw to abort
// the render — we just want to assert it was called. Wrap each
// render in an error boundary that swallows the throw.
function renderGuard(role: ReturnType<typeof makeSession> | null) {
  if (role) {
    useSessionMock.mockReturnValue(role);
  }
  let caught: Error | null = null;
  try {
    render(
      <SettingsGuard>
        {(readOnly) => <Probe readOnly={readOnly} />}
      </SettingsGuard>,
    );
  } catch (err) {
    caught = err instanceof Error ? err : new Error(String(err));
  }
  return caught;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SettingsGuard — RBAC routing", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    toastErrorMock.mockClear();
    useSessionMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children with readOnly=false for ADMIN (pass-through)", () => {
    renderGuard(makeSession("ADMIN"));
    const probe = screen.getByTestId("probe");
    expect(probe).toHaveAttribute("data-readonly", "false");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders children with readOnly=true for SECRETARY (view-only)", () => {
    renderGuard(makeSession("SECRETARY"));
    const probe = screen.getByTestId("probe");
    expect(probe).toHaveAttribute("data-readonly", "true");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects PROFESSIONAL to /dashboard (no children rendered)", () => {
    renderGuard(makeSession("PROFESSIONAL"));
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    expect(screen.queryByTestId("probe")).not.toBeInTheDocument();
  });

  it("redirects PATIENT to /dashboard (defense in depth)", () => {
    renderGuard(makeSession("PATIENT"));
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    expect(screen.queryByTestId("probe")).not.toBeInTheDocument();
  });

  it("renders nothing when session is null (unauthenticated → layout handles it)", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    render(
      <SettingsGuard>
        {() => <Probe readOnly={false} />}
      </SettingsGuard>,
    );
    // The guard does NOT redirect; the dashboard layout is the
    // boundary that handles unauthenticated users.
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("probe")).not.toBeInTheDocument();
  });
});
