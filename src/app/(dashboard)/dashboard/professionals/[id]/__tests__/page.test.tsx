/**
 * Tests for the `/dashboard/professionals/[id]` Server Component
 * page.
 *
 * The page is the entry point for the detail view of a single
 * professional. It:
 *   1. Reads `params.id` from the dynamic route.
 *   2. Resolves `organizationId` from the active org cookie.
 *   3. Resolves the session role so the Edit button and status
 *      change dropdown can be hidden for PROFESSIONAL (read-only).
 *   4. Fetches the professional with `getProfessionalById(orgId, id)`
 *      — `null` → `notFound()` (404). Wrong org → also 404.
 *   5. Renders the `<ProfessionalDetailCard>` Client Component with
 *      the enriched professional and the `canEdit` boolean.
 *
 * Mock strategy: we mock `getOrganizationId`, `getProfessionalById`,
 * `getSession`, and `notFound`. The `ProfessionalDetailCard` Client
 * Component is also mocked so we can assert on the props the page
 * hands to it (not the card's internal rendering — that has its own
 * test file).
 *
 * Spec scenarios covered (from
 * `openspec/changes/professionals/specs/professionals-presentation/spec.md`):
 * - `professionals-detail` — Detail renders professional info with specialties
 * - `professionals-detail` — Status change toggle from detail
 * - `professionals-detail` — Detail 404 for nonexistent professional
 * - `professionals-detail` — Detail hides status toggle for PROFESSIONAL role
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

const getSessionMock = vi.fn();
vi.mock("@/core/auth/auth-instance", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

const headersMock = vi.fn().mockResolvedValue(new Headers());
vi.mock("next/headers", () => ({
  headers: headersMock,
}));

const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/components/professionals/professional-detail-card", () => ({
  ProfessionalDetailCard: (props: {
    professional: EnrichedProfessional;
    canEdit: boolean;
  }) => (
    <div
      data-testid="mock-professional-detail-card"
      data-professional-id={props.professional.id}
      data-can-edit={String(props.canEdit)}
    />
  ),
}));

const { default: ProfessionalDetailPage } = await import("../page");

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
  specialties: ["Dermatología", "Cirugía"],
  license: "MN-12345",
  bio: "Bio",
  status: ProfessionalStatus.ACTIVE,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function sessionFor(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT") {
  return { user: { id: USER_ID, role } };
}

beforeEach(() => {
  vi.clearAllMocks();
  getOrganizationIdMock.mockReset();
  getOrganizationIdMock.mockResolvedValue(ORG_ID);
  getProfessionalByIdMock.mockReset();
  getProfessionalByIdMock.mockResolvedValue(sampleProfessional);
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue(sessionFor("ADMIN"));
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
      await ProfessionalDetailPage({
        params: Promise.resolve({ id }),
      }),
    );
  });
  return result as ReturnType<typeof render>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/dashboard/professionals/[id] — data wiring", () => {
  it("calls getOrganizationId and getProfessionalById with the right ids", async () => {
    await renderPage();
    expect(getOrganizationIdMock).toHaveBeenCalled();
    expect(getProfessionalByIdMock).toHaveBeenCalledWith(ORG_ID, PROFESSIONAL_ID);
  });

  it("renders the ProfessionalDetailCard with the fetched professional", async () => {
    await renderPage();
    const card = screen.getByTestId("mock-professional-detail-card");
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute("data-professional-id", PROFESSIONAL_ID);
  });
});

describe("/dashboard/professionals/[id] — RBAC (canEdit)", () => {
  it("sets canEdit=true for ADMIN role", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    await renderPage();
    const card = screen.getByTestId("mock-professional-detail-card");
    expect(card).toHaveAttribute("data-can-edit", "true");
  });

  it("sets canEdit=true for SECRETARY role", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));
    await renderPage();
    const card = screen.getByTestId("mock-professional-detail-card");
    expect(card).toHaveAttribute("data-can-edit", "true");
  });

  it("sets canEdit=false for PROFESSIONAL role (read-only)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));
    await renderPage();
    const card = screen.getByTestId("mock-professional-detail-card");
    expect(card).toHaveAttribute("data-can-edit", "false");
  });

  it("sets canEdit=false when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    await renderPage();
    const card = screen.getByTestId("mock-professional-detail-card");
    expect(card).toHaveAttribute("data-can-edit", "false");
  });
});

describe("/dashboard/professionals/[id] — 404 handling", () => {
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
