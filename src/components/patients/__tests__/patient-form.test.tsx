/**
 * Tests for the `PatientForm` Client Component.
 *
 * The form is the edit page. It:
 *   1. Renders with pre-filled values from the `patient` prop
 *   2. Validates fields client-side with Zod 4
 *   3. Submits via the `updatePatient` Server Action (mocked)
 *   4. On success, redirects to the detail page (router.push)
 *   5. On error, displays the action's Spanish error message
 *
 * The Server Action and the Next.js router are mocked so the test
 * stays pure RTL + jsdom. The form is small enough that we don't
 * need to mock the input components — they render as native inputs.
 *
 * Spec scenarios covered (from
 * `openspec/changes/patients/specs/patients-domain/spec.md`):
 * - patients-edit — pre-fills, empty name, bad email, bad documentId,
 *   notes>1000, valid submit.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { EnrichedPatient } from "@/modules/patients/data/patient-data.types";
import { PatientStatus } from "@/modules/patients/domain/patient";

// ---------------------------------------------------------------------------
// Mock declarations — Server Action + Next.js router.
// ---------------------------------------------------------------------------

const updatePatientMock = vi.fn();
vi.mock("@/modules/patients/actions", () => ({
  updatePatient: updatePatientMock,
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
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
const { PatientForm } = await import("@/components/patients/patient-form");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const PATIENT_ID = "00000000-0000-4000-8000-0000000000c1";
const ORG_ID = "00000000-0000-4000-8000-000000000001";

const basePatient: EnrichedPatient = {
  id: PATIENT_ID,
  organizationId: ORG_ID,
  fullName: "Ana Torres",
  email: "ana@example.com",
  phone: "+54 11 5555-1234",
  documentId: "40123456",
  status: PatientStatus.ACTIVE,
  notes: "Existing notes",
  createdByUserId: "00000000-0000-4000-8000-0000000000aa",
  createdByUserName: "Admin Pérez",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function renderForm(patient: EnrichedPatient = basePatient) {
  return render(<PatientForm patient={patient} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  updatePatientMock.mockResolvedValue({ success: true });
});

// ---------------------------------------------------------------------------
// Pre-fill
// ---------------------------------------------------------------------------

describe("PatientForm — pre-fill", () => {
  it("pre-fills the fullName input with the patient's name", () => {
    renderForm();
    const input = screen.getByLabelText(/nombre completo/i) as HTMLInputElement;
    expect(input.value).toBe("Ana Torres");
  });

  it("pre-fills the email input with the patient's email", () => {
    renderForm();
    const input = screen.getByLabelText(/^email/i) as HTMLInputElement;
    expect(input.value).toBe("ana@example.com");
  });

  it("pre-fills the phone input with the patient's phone", () => {
    renderForm();
    const input = screen.getByLabelText(/teléfono/i) as HTMLInputElement;
    expect(input.value).toBe("+54 11 5555-1234");
  });

  it("pre-fills the documentId input with the patient's DNI", () => {
    renderForm();
    const input = screen.getByLabelText(/^dni/i) as HTMLInputElement;
    expect(input.value).toBe("40123456");
  });

  it("pre-fills the notes textarea with the patient's notes", () => {
    renderForm();
    const input = screen.getByLabelText(/notas/i) as HTMLTextAreaElement;
    expect(input.value).toBe("Existing notes");
  });
});

// ---------------------------------------------------------------------------
// Client-side validation
// ---------------------------------------------------------------------------

describe("PatientForm — client-side validation", () => {
  it("shows 'El nombre es requerido' when fullName is cleared", async () => {
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByLabelText(/nombre completo/i);
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));
    expect(await screen.findByText(/el nombre es requerido/i)).toBeInTheDocument();
    // Server Action must not be called when client validation fails.
    expect(updatePatientMock).not.toHaveBeenCalled();
  });

  it("shows 'Email inválido' when email format is invalid", async () => {
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByLabelText(/^email/i);
    await user.clear(input);
    await user.type(input, "bad-email");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));
    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
    expect(updatePatientMock).not.toHaveBeenCalled();
  });

  it("shows 'El DNI debe tener 7-8 dígitos sin separadores' when documentId is invalid", async () => {
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByLabelText(/^dni/i);
    await user.clear(input);
    await user.type(input, "ABC123");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));
    expect(
      await screen.findByText(/DNI debe tener 7-8 d[ií]gitos/i),
    ).toBeInTheDocument();
    expect(updatePatientMock).not.toHaveBeenCalled();
  });

  it("shows 'Las notas deben tener máximo 1000 caracteres' when notes exceed 1000 chars", async () => {
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByLabelText(/notas/i);
    // Use fireEvent to bypass the textarea's maxLength UX hint so
    // the value is actually 1001 chars when Zod parses it. The
    // Zod schema is the single source of truth for the limit.
    await user.clear(input);
    input.focus();
    // Simulate the change directly with 1001 chars.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    setter?.call(input, "a".repeat(1001));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));
    expect(
      await screen.findByText(/m[aá]ximo 1000 caracteres/i),
    ).toBeInTheDocument();
    expect(updatePatientMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Valid submit
// ---------------------------------------------------------------------------

describe("PatientForm — valid submit", () => {
  it("calls updatePatient with the form values (only changed fields) on valid submit", async () => {
    const user = userEvent.setup();
    renderForm();
    const fullName = screen.getByLabelText(/nombre completo/i);
    await user.clear(fullName);
    await user.type(fullName, "Ana Pérez");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    // Wait for the action to be called.
    await vi.waitFor(() => {
      expect(updatePatientMock).toHaveBeenCalled();
    });
    // The action receives the id + the changed fields. fullName is the
    // one field the test changed, so it MUST be in the payload.
    const call = updatePatientMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call).toMatchObject({ id: PATIENT_ID, fullName: "Ana Pérez" });
  });

  it("redirects to the patient detail page on successful update", async () => {
    const user = userEvent.setup();
    updatePatientMock.mockResolvedValueOnce({ success: true });
    renderForm();
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await vi.waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(`/dashboard/patients/${PATIENT_ID}`);
    });
  });

  it("toasts success on a successful update", async () => {
    const user = userEvent.setup();
    updatePatientMock.mockResolvedValueOnce({ success: true });
    renderForm();
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await vi.waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it("displays the server error message inline when the action returns an error", async () => {
    const user = userEvent.setup();
    updatePatientMock.mockResolvedValueOnce({
      success: false,
      error: "Ya existe un paciente con ese email",
    });
    renderForm();
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(
      await screen.findByText(/ya existe un paciente con ese email/i),
    ).toBeInTheDocument();
    // We must NOT have redirected.
    expect(pushMock).not.toHaveBeenCalled();
  });
});
