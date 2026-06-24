/**
 * Tests for the `ProfessionalForm` Client Component.
 *
 * The form is shared between the create page
 * (`/dashboard/professionals/new`) and the edit page
 * (`/dashboard/professionals/[id]/edit`). The form:
 *   1. Renders empty in create mode (no `professional` prop)
 *   2. Renders pre-filled in edit mode (the `professional` prop
 *      carries the current values, including specialties as tag chips)
 *   3. Validates client-side with Zod 4 (Spanish errors)
 *   4. Submits via the matching Server Action (mocked) —
 *      `createProfessional` when no `professional` prop,
 *      `updateProfessional` when in edit mode
 *   5. On success → toast + `router.replace()` to the appropriate page
 *      (detail page for create, detail page for edit)
 *   6. On error → inline error message above the form
 *
 * The Server Actions and the Next.js router are mocked so the test
 * stays pure RTL + jsdom. We render the form inside a small wrapper
 * to keep the same props shape used by the create / edit pages.
 *
 * Spec scenarios covered (from
 * `openspec/changes/professionals/specs/professionals-presentation/spec.md`):
 * - `professionals-create` — Tag input for specialties
 * - `professionals-create` — Client-side validation rejects empty name
 * - `professionals-create` — Client-side validation rejects invalid email
 * - `professionals-create` — Successful create redirects to list
 * - `professionals-create` — Form displays server error inline
 * - `professionals-edit`   — Edit form pre-fills existing professional data
 * - `professionals-edit`   — Edit form validates empty name
 * - `professionals-edit`   — Successful update redirects to detail
 * - `professionals-edit`   — Edit form handles server-side error
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfessionalStatus } from "@/modules/professionals/domain/professional";
import type { EnrichedProfessional } from "@/modules/professionals/data/professional-data.types";

// ---------------------------------------------------------------------------
// Mock declarations — Server Actions + Next.js router + toast.
// ---------------------------------------------------------------------------

const createProfessionalMock = vi.fn();
const updateProfessionalMock = vi.fn();
vi.mock(import("@/modules/professionals/actions"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createProfessional: createProfessionalMock,
    updateProfessional: updateProfessionalMock,
  };
});

const replaceMock = vi.fn();
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: vi.fn() }),
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
const { ProfessionalForm } = await import(
  "@/components/professionals/professional-form"
);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000a1";
const USER_ID = "00000000-0000-4000-8000-0000000000a2";
const ORG_ID = "00000000-0000-4000-8000-000000000001";

const baseProfessional: EnrichedProfessional = {
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
};

function renderCreateForm() {
  return render(<ProfessionalForm mode="create" />);
}

function renderEditForm(professional: EnrichedProfessional = baseProfessional) {
  return render(<ProfessionalForm mode="edit" professional={professional} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  createProfessionalMock.mockResolvedValue({
    success: true,
    data: { id: PROFESSIONAL_ID },
  });
  updateProfessionalMock.mockResolvedValue({ success: true });
});

// ---------------------------------------------------------------------------
// Pre-fill (edit mode)
// ---------------------------------------------------------------------------

describe("ProfessionalForm — pre-fill (edit mode)", () => {
  it("pre-fills the full name input with the professional's name", () => {
    renderEditForm();
    const input = screen.getByLabelText(/nombre completo/i) as HTMLInputElement;
    expect(input.value).toBe("Dr. García");
  });

  it("pre-fills the email input with the professional's email", () => {
    renderEditForm();
    const input = screen.getByLabelText(/^email/i) as HTMLInputElement;
    expect(input.value).toBe("garcia@test.com");
  });

  it("pre-fills the license input with the professional's license", () => {
    renderEditForm();
    const input = screen.getByLabelText(/matr[ií]cula/i) as HTMLInputElement;
    expect(input.value).toBe("MN-12345");
  });

  it("pre-fills the bio textarea with the professional's bio", () => {
    renderEditForm();
    const input = screen.getByLabelText(/^bio/i) as HTMLTextAreaElement;
    expect(input.value).toBe("Especialista con 10 años de experiencia");
  });

  it("pre-fills the status select with the professional's status", () => {
    renderEditForm();
    const select = screen.getByLabelText(/estado/i) as HTMLSelectElement;
    expect(select.value).toBe(ProfessionalStatus.ACTIVE);
  });

  it("pre-fills the specialties as tag chips", () => {
    renderEditForm();
    expect(screen.getByText("Dermatología")).toBeInTheDocument();
    expect(screen.getByText("Cirugía")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Create mode — empty defaults
// ---------------------------------------------------------------------------

describe("ProfessionalForm — create mode defaults", () => {
  it("renders the full name input as empty", () => {
    renderCreateForm();
    const input = screen.getByLabelText(/nombre completo/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("renders the email input as empty", () => {
    renderCreateForm();
    const input = screen.getByLabelText(/^email/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("renders the license input as empty", () => {
    renderCreateForm();
    const input = screen.getByLabelText(/matr[ií]cula/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("renders the bio textarea as empty", () => {
    renderCreateForm();
    const input = screen.getByLabelText(/^bio/i) as HTMLTextAreaElement;
    expect(input.value).toBe("");
  });

  it("defaults the status select to ACTIVE", () => {
    renderCreateForm();
    const select = screen.getByLabelText(/estado/i) as HTMLSelectElement;
    expect(select.value).toBe(ProfessionalStatus.ACTIVE);
  });

  it("renders no specialty chips initially", () => {
    renderCreateForm();
    // The wrapper has testid="tag-input" and the input field has
    // testid="tag-input-field"; a real tag chip has testid="tag-<value>".
    // We assert that NO element matches the chip pattern.
    const container = document.body;
    const chips = container.querySelectorAll('[data-testid^="tag-"]:not([data-testid="tag-input"]):not([data-testid="tag-input-field"])');
    expect(chips).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Client-side validation
// ---------------------------------------------------------------------------

describe("ProfessionalForm — client-side validation", () => {
  it("shows 'Full name must be 1-100 characters' when fullName is cleared and submit is pressed", async () => {
    const user = userEvent.setup();
    renderEditForm();
    const input = screen.getByLabelText(/nombre completo/i);
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(
      await screen.findByText(/full name must be 1-100 characters/i),
    ).toBeInTheDocument();
    expect(updateProfessionalMock).not.toHaveBeenCalled();
  });

  it("shows 'Invalid email format' when email is invalid", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    // Fill all required fields with valid values first
    await user.type(screen.getByLabelText(/nombre completo/i), "Dr. Test");
    // Add a specialty via the tag input
    const tagInput = screen.getByTestId("tag-input-field");
    await user.type(tagInput, "Cardiología{Enter}");
    // Set an invalid email
    const email = screen.getByLabelText(/^email/i);
    await user.clear(email);
    await user.type(email, "bad-email");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(
      await screen.findByText(/invalid email format/i),
    ).toBeInTheDocument();
    expect(createProfessionalMock).not.toHaveBeenCalled();
  });

  it("shows 'At least one specialty is required' when no specialties are added", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    await user.type(screen.getByLabelText(/nombre completo/i), "Dr. Test");
    await user.type(screen.getByLabelText(/^email/i), "test@test.com");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(
      await screen.findByText(/at least one specialty is required/i),
    ).toBeInTheDocument();
    expect(createProfessionalMock).not.toHaveBeenCalled();
  });

  it("does NOT submit when client-side validation fails", async () => {
    const user = userEvent.setup();
    renderEditForm();
    const name = screen.getByLabelText(/nombre completo/i);
    await user.clear(name);
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    await screen.findByText(/full name must be 1-100 characters/i);
    expect(updateProfessionalMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tag input for specialties
// ---------------------------------------------------------------------------

describe("ProfessionalForm — tag input for specialties", () => {
  it("adds a tag when the user types and presses Enter", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    const tagInput = screen.getByTestId("tag-input-field");
    await user.type(tagInput, "Cardiología{Enter}");
    expect(screen.getByText("Cardiología")).toBeInTheDocument();
  });

  it("removes a tag when the user clicks its × button", async () => {
    const user = userEvent.setup();
    renderEditForm();
    expect(screen.getByText("Dermatología")).toBeInTheDocument();
    const removeButton = screen.getByRole("button", {
      name: /quitar tag dermatolog[ií]a/i,
    });
    await user.click(removeButton);
    expect(screen.queryByText("Dermatología")).not.toBeInTheDocument();
    expect(screen.getByText("Cirugía")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Valid submit
// ---------------------------------------------------------------------------

describe("ProfessionalForm — valid submit (create)", () => {
  it("calls createProfessional with the form values on valid submit", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    await user.type(screen.getByLabelText(/nombre completo/i), "Dr. Test");
    await user.type(screen.getByLabelText(/^email/i), "test@test.com");
    const tagInput = screen.getByTestId("tag-input-field");
    await user.type(tagInput, "Cardiología{Enter}");
    await user.type(screen.getByLabelText(/matr[ií]cula/i), "MN-99999");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await vi.waitFor(() => {
      expect(createProfessionalMock).toHaveBeenCalled();
    });
    const call = createProfessionalMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call).toMatchObject({
      fullName: "Dr. Test",
      email: "test@test.com",
      specialties: ["Cardiología"],
      license: "MN-99999",
      status: ProfessionalStatus.ACTIVE,
    });
  });

  it("redirects to /dashboard/professionals/{newId} on successful create", async () => {
    const user = userEvent.setup();
    createProfessionalMock.mockResolvedValueOnce({
      success: true,
      data: { id: "new-pro-id" },
    });
    renderCreateForm();
    await user.type(screen.getByLabelText(/nombre completo/i), "Dr. Test");
    await user.type(screen.getByLabelText(/^email/i), "test@test.com");
    const tagInput = screen.getByTestId("tag-input-field");
    await user.type(tagInput, "Cardiología{Enter}");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/dashboard/professionals/new-pro-id",
      );
    });
  });

  it("toasts success on a successful create", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    await user.type(screen.getByLabelText(/nombre completo/i), "Dr. Test");
    await user.type(screen.getByLabelText(/^email/i), "test@test.com");
    const tagInput = screen.getByTestId("tag-input-field");
    await user.type(tagInput, "Cardiología{Enter}");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await vi.waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it("displays the server error inline when the action returns an error", async () => {
    const user = userEvent.setup();
    createProfessionalMock.mockResolvedValueOnce({
      success: false,
      error: "Ya existe un profesional con ese email",
    });
    renderCreateForm();
    await user.type(screen.getByLabelText(/nombre completo/i), "Dr. Test");
    await user.type(screen.getByLabelText(/^email/i), "test@test.com");
    const tagInput = screen.getByTestId("tag-input-field");
    await user.type(tagInput, "Cardiología{Enter}");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByText(/ya existe un profesional con ese email/i),
    ).toBeInTheDocument();
    // We must NOT have redirected.
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe("ProfessionalForm — valid submit (edit)", () => {
  it("calls updateProfessional with the professional id on valid submit", async () => {
    const user = userEvent.setup();
    renderEditForm();
    const name = screen.getByLabelText(/nombre completo/i);
    await user.clear(name);
    await user.type(name, "Dr. García v2");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await vi.waitFor(() => {
      expect(updateProfessionalMock).toHaveBeenCalled();
    });
    const call = updateProfessionalMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call).toMatchObject({
      id: PROFESSIONAL_ID,
      fullName: "Dr. García v2",
    });
  });

  it("redirects to /dashboard/professionals/{id} on successful update", async () => {
    const user = userEvent.setup();
    renderEditForm();
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        `/dashboard/professionals/${PROFESSIONAL_ID}`,
      );
    });
  });

  it("displays the server error inline when the action returns an error", async () => {
    const user = userEvent.setup();
    updateProfessionalMock.mockResolvedValueOnce({
      success: false,
      error: "Profesional no encontrado",
    });
    renderEditForm();
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByText(/profesional no encontrado/i),
    ).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cancel button
// ---------------------------------------------------------------------------

describe("ProfessionalForm — cancel link", () => {
  it("renders a Cancel link to /dashboard/professionals (create mode)", () => {
    renderCreateForm();
    const link = screen.getByRole("link", { name: /cancelar/i });
    expect(link).toHaveAttribute("href", "/dashboard/professionals");
  });

  it("renders a Cancel link to /dashboard/professionals/{id} (edit mode)", () => {
    renderEditForm();
    const link = screen.getByRole("link", { name: /cancelar/i });
    expect(link).toHaveAttribute("href", `/dashboard/professionals/${PROFESSIONAL_ID}`);
  });
});
