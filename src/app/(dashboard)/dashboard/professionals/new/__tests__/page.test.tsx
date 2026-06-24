/**
 * Tests for the `/dashboard/professionals/new` Server Component page.
 *
 * The page is the entry point for creating a new professional. It:
 *   1. Resolves `organizationId` from the active org cookie via
 *      `getOrganizationId()`.
 *   2. Renders the page header ("Nuevo Profesional").
 *   3. Renders the `<ProfessionalForm>` Client Component in create
 *      mode.
 *   4. The form itself owns the Zod validation, the
 *      `createProfessional` Server Action, and the post-submit
 *      redirect. The page is intentionally thin.
 *
 * Mock strategy: we mock `getOrganizationId` and the
 * `ProfessionalForm` Client Component so the test doesn't pull in
 * the form's own runtime (and so we can assert on the page's
 * structure without going through the full form's test suite).
 *
 * RBAC: the dashboard layout already redirects PATIENT users. The
 * `createProfessional` Server Action re-checks the role as defense
 * in depth. PROFESSIONAL users can view the page but the Server
 * Action will reject the submission; we still render the form to
 * keep the URL/page consistent.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getOrganizationIdMock = vi.fn();
vi.mock("@/modules/dashboard/data/get-organization-id", () => ({
  getOrganizationId: getOrganizationIdMock,
}));

vi.mock("@/components/professionals/professional-form", () => ({
  ProfessionalForm: (props: { mode: "create" | "edit" }) => (
    <div
      data-testid="mock-professional-form"
      data-mode={props.mode}
    />
  ),
}));

const { default: NewProfessionalPage } = await import("../page");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  getOrganizationIdMock.mockReset();
  getOrganizationIdMock.mockResolvedValue(ORG_ID);
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderPage() {
  let result: ReturnType<typeof render> | undefined;
  // The page is an async Server Component — we await the call to get
  // the rendered JSX, then pass that to RTL.
  await act(async () => {
    result = render(await NewProfessionalPage());
  });
  return result as ReturnType<typeof render>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/dashboard/professionals/new — page header", () => {
  it("renders the 'Nuevo Profesional' heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { name: /nuevo profesional/i }),
    ).toBeInTheDocument();
  });

  it("renders a subtitle that explains the page", async () => {
    await renderPage();
    expect(
      screen.getByText(/creá un nuevo profesional/i),
    ).toBeInTheDocument();
  });
});

describe("/dashboard/professionals/new — form wiring", () => {
  it("renders the ProfessionalForm in create mode", async () => {
    await renderPage();
    const form = screen.getByTestId("mock-professional-form");
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute("data-mode", "create");
  });

  it("calls getOrganizationId to resolve the active org", async () => {
    await renderPage();
    expect(getOrganizationIdMock).toHaveBeenCalled();
  });
});

afterEach(() => {
  cleanup();
});
