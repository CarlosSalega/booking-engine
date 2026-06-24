/**
 * Tests for the `ProfessionalDetailCard` Client Component.
 *
 * Renders the full detail view of a single professional:
 *   - Name, email, avatar (when image is set)
 *   - Specialties as chips/badges
 *   - License and bio
 *   - Status badge
 *   - Status change dropdown (wired to the Server Action)
 *   - "Editar" button (hidden when canEdit is false — PROFESSIONAL role)
 *
 * The Server Action (`changeProfessionalStatus`) and the Next.js
 * router are mocked so the test stays pure RTL + jsdom.
 *
 * Spec scenarios covered (from
 * `openspec/changes/professionals/specs/professionals-presentation/spec.md`):
 * - `professionals-detail` — Detail renders professional info with specialties
 * - `professionals-detail` — Status change toggle from detail
 * - `professionals-detail` — Detail hides status toggle for PROFESSIONAL role
 * - `professionals-detail` — Detail 404 for nonexistent professional (handled by page)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfessionalStatus } from "@/modules/professionals/domain/professional";
import type { EnrichedProfessional } from "@/modules/professionals/data/professional-data.types";

// ---------------------------------------------------------------------------
// Mock declarations — Server Actions + Next.js router + toast.
// ---------------------------------------------------------------------------

const changeStatusMock = vi.fn();
vi.mock(import("@/modules/professionals/actions"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    changeProfessionalStatus: changeStatusMock,
  };
});

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: refreshMock,
  }),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), {
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

// Import after mocks are in place.
const { ProfessionalDetailCard } = await import(
  "@/components/professionals/professional-detail-card"
);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000a1";
const USER_ID = "00000000-0000-4000-8000-0000000000a2";
const ORG_ID = "00000000-0000-4000-8000-000000000001";

function makeProfessional(
  overrides: Partial<EnrichedProfessional> = {},
): EnrichedProfessional {
  return {
    id: PROFESSIONAL_ID,
    organizationId: ORG_ID,
    userId: USER_ID,
    fullName: "Dr. García",
    email: "garcia@test.com",
    image: undefined,
    specialties: ["Dermatología", "Cirugía"],
    license: "MN-12345",
    bio: "Especialista con 10 años de experiencia",
    status: ProfessionalStatus.ACTIVE,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  changeStatusMock.mockResolvedValue({ success: true });
});

// ---------------------------------------------------------------------------
// Render info
// ---------------------------------------------------------------------------

describe("ProfessionalDetailCard — render info", () => {
  it("renders the professional's full name as the heading", () => {
    render(<ProfessionalDetailCard professional={makeProfessional()} canEdit />);
    expect(
      screen.getByRole("heading", { name: "Dr. García" }),
    ).toBeInTheDocument();
  });

  it("renders the professional's email", () => {
    render(<ProfessionalDetailCard professional={makeProfessional()} canEdit />);
    expect(screen.getByText("garcia@test.com")).toBeInTheDocument();
  });

  it("renders the professional's license", () => {
    render(<ProfessionalDetailCard professional={makeProfessional()} canEdit />);
    expect(screen.getByText("MN-12345")).toBeInTheDocument();
  });

  it("renders the professional's bio", () => {
    render(<ProfessionalDetailCard professional={makeProfessional()} canEdit />);
    expect(
      screen.getByText("Especialista con 10 años de experiencia"),
    ).toBeInTheDocument();
  });

  it("renders each specialty as a chip/badge", () => {
    render(
      <ProfessionalDetailCard
        professional={makeProfessional({
          specialties: ["Dermatología", "Cirugía"],
        })}
        canEdit
      />,
    );
    // Both specialties should appear as rendered text.
    expect(screen.getByText("Dermatología")).toBeInTheDocument();
    expect(screen.getByText("Cirugía")).toBeInTheDocument();
  });

  it("renders the status badge with 'Activo' for ACTIVE status", () => {
    render(
      <ProfessionalDetailCard
        professional={makeProfessional({ status: ProfessionalStatus.ACTIVE })}
        canEdit
      />,
    );
    expect(screen.getAllByText("Activo").length).toBeGreaterThan(0);
  });

  it("renders the status badge with 'Inactivo' for INACTIVE status", () => {
    render(
      <ProfessionalDetailCard
        professional={makeProfessional({ status: ProfessionalStatus.INACTIVE })}
        canEdit
      />,
    );
    expect(screen.getAllByText("Inactivo").length).toBeGreaterThan(0);
  });

  it("renders the em-dash placeholder when the bio is undefined", () => {
    render(
      <ProfessionalDetailCard
        professional={makeProfessional({ bio: undefined })}
        canEdit
      />,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Status change toggle (RBAC: canEdit must be true)
// ---------------------------------------------------------------------------

describe("ProfessionalDetailCard — status change toggle", () => {
  it("calls changeProfessionalStatus with the new status when the user picks one", async () => {
    const user = userEvent.setup();
    render(
      <ProfessionalDetailCard
        professional={makeProfessional({ status: ProfessionalStatus.ACTIVE })}
        canEdit
      />,
    );

    // Click the Inactivo button (the non-current option)
    const inactiveButton = screen.getByRole("button", { name: /inactivo/i });
    await user.click(inactiveButton);

    await vi.waitFor(() => {
      expect(changeStatusMock).toHaveBeenCalledWith({
        id: PROFESSIONAL_ID,
        status: ProfessionalStatus.INACTIVE,
      });
    });
  });

  it("toasts success and refreshes the page on a successful status change", async () => {
    const user = userEvent.setup();
    render(
      <ProfessionalDetailCard
        professional={makeProfessional({ status: ProfessionalStatus.ACTIVE })}
        canEdit
      />,
    );
    const inactiveButton = screen.getByRole("button", { name: /inactivo/i });
    await user.click(inactiveButton);

    await vi.waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("toasts the server error and does NOT refresh on a failed status change", async () => {
    const user = userEvent.setup();
    changeStatusMock.mockResolvedValueOnce({
      success: false,
      error: "Profesional no encontrado",
    });
    render(
      <ProfessionalDetailCard
        professional={makeProfessional({ status: ProfessionalStatus.ACTIVE })}
        canEdit
      />,
    );
    const inactiveButton = screen.getByRole("button", { name: /inactivo/i });
    await user.click(inactiveButton);

    await vi.waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Profesional no encontrado",
      );
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// RBAC: PROFESSIONAL role
// ---------------------------------------------------------------------------

describe("ProfessionalDetailCard — RBAC (canEdit = false)", () => {
  it("does NOT render the status change dropdown when canEdit is false", () => {
    render(
      <ProfessionalDetailCard
        professional={makeProfessional()}
        canEdit={false}
      />,
    );
    // The status buttons are rendered via the change-status dropdown.
    expect(
      screen.queryByRole("button", { name: /inactivo/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT render the Editar button when canEdit is false", () => {
    render(
      <ProfessionalDetailCard
        professional={makeProfessional()}
        canEdit={false}
      />,
    );
    expect(
      screen.queryByRole("link", { name: /editar/i }),
    ).not.toBeInTheDocument();
  });

  it("DOES render the Editar button when canEdit is true", () => {
    render(
      <ProfessionalDetailCard
        professional={makeProfessional()}
        canEdit
      />,
    );
    const link = screen.getByRole("link", { name: /editar/i });
    expect(link).toHaveAttribute("href", `/dashboard/professionals/${PROFESSIONAL_ID}/edit`);
  });
});

// ---------------------------------------------------------------------------
// Back link
// ---------------------------------------------------------------------------

describe("ProfessionalDetailCard — back link", () => {
  it("renders a back link to /dashboard/professionals", () => {
    render(
      <ProfessionalDetailCard professional={makeProfessional()} canEdit />,
    );
    const link = screen.getByRole("link", { name: /volver al listado/i });
    expect(link).toHaveAttribute("href", "/dashboard/professionals");
  });
});
