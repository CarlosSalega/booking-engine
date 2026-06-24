/**
 * Tests for the `/dashboard/professionals/[id]/edit` Server Component
 * page.
 *
 * The page is the entry point for editing an existing professional.
 * It:
 *   1. Reads `params.id` from the dynamic route.
 *   2. Resolves `organizationId` from the active org cookie.
 *   3. Fetches the professional with `getProfessionalById(orgId, id)`
 *      — `null` → `notFound()` (404). Wrong org → also 404.
 *   4. Renders the page header ("Editar profesional").
 *   5. Renders the `<ProfessionalForm>` Client Component in edit
 *      mode, pre-filled with the fetched professional data.
 *
 * Mock strategy: we mock `getOrganizationId`, `getProfessionalById`,
 * and `notFound`. The `ProfessionalForm` Client Component is also
 * mocked so the test doesn't pull in the form's own runtime.
 *
 * Spec scenarios covered (from
 * `openspec/changes/professionals/specs/professionals-presentation/spec.md`):
 * - `professionals-edit` — Edit form pre-fills existing professional data
 * - `professionals-edit` — Edit page 404 for nonexistent professional
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";

import { ProfessionalStatus } from "@/modules/professionals/domain/professional";
import type { EnrichedProfessional } from "@/modules/professionals/data/professional-data.types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getOrganizationIdMock = vi.fn();
vi.mock("@/modules/dashboard/data/get-organization-id", () => ({
  getOrganizationId: getOrganizationIdMock,
}));

const getProfessionalByIdMock = vi.fn();
vi.mock("@/modules/professionals/data/professional-data", () => ({
  getProfessionalById: getProfessionalByIdMock,
}));

const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/components/professionals/professional-form", () => ({
  ProfessionalForm: (props: {
    mode: "create" | "edit";
    professional?: EnrichedProfessional;
  }) => (
    <div
      data-testid="mock-professional-form"
      data-mode={props.mode}
      data-professional-id={props.professional?.id ?? ""}
      data-professional-name={props.professional?.fullName ?? ""}
    />
  ),
}));

const { default: EditProfessionalPage } = await import("../page");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000a1";
const USER_ID = "00000000-0000-4000-8000-0000000000a2";

const sampleProfessional: EnrichedProfessional = {
  id: PROFESSIONAL_ID,
  organizationId: ORG_ID,
  userId: USER_ID,
  fullName: "Dr. García",
  email: "garcia@test.com",
  image: undefined,
  specialties: ["Dermatología"],
  license: "MN-12345",
  bio: "Bio",
  status: ProfessionalStatus.ACTIVE,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  getOrganizationIdMock.mockReset();
  getOrganizationIdMock.mockResolvedValue(ORG_ID);
  getProfessionalByIdMock.mockReset();
  getProfessionalByIdMock.mockResolvedValue(sampleProfessional);
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderPage(id: string = PROFESSIONAL_ID) {
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(
      // The page accepts a `Promise<{id: string}>` — we resolve it
      // synchronously in the test.
      await EditProfessionalPage({
        params: Promise.resolve({ id }),
      }),
    );
  });
  return result as ReturnType<typeof render>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/dashboard/professionals/[id]/edit — page header", () => {
  it("renders the 'Editar profesional' heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { name: /editar profesional/i }),
    ).toBeInTheDocument();
  });
});

describe("/dashboard/professionals/[id]/edit — form wiring", () => {
  it("renders the ProfessionalForm in edit mode with the fetched professional", async () => {
    await renderPage();
    const form = screen.getByTestId("mock-professional-form");
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute("data-mode", "edit");
    expect(form).toHaveAttribute("data-professional-id", PROFESSIONAL_ID);
    expect(form).toHaveAttribute("data-professional-name", "Dr. García");
  });

  it("calls getOrganizationId and getProfessionalById with the right ids", async () => {
    await renderPage();
    expect(getOrganizationIdMock).toHaveBeenCalled();
    expect(getProfessionalByIdMock).toHaveBeenCalledWith(ORG_ID, PROFESSIONAL_ID);
  });
});

describe("/dashboard/professionals/[id]/edit — 404 handling", () => {
  it("calls notFound() when getProfessionalById returns null", async () => {
    getProfessionalByIdMock.mockResolvedValueOnce(null);
    await expect(renderPage()).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("calls notFound() when the professional is in a different org", async () => {
    // The data layer returns null for cross-org access; the page
    // just propagates that to notFound.
    getProfessionalByIdMock.mockResolvedValueOnce(null);
    await expect(renderPage()).rejects.toThrow("NOT_FOUND");
  });
});
