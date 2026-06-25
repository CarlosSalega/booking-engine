/**
 * Tests for the `ServiceForm` Client Component.
 *
 * The form is shared between the create page (`/dashboard/services/new`)
 * and the edit page (`/dashboard/services/[id]/edit`). The form:
 *   1. Renders empty in create mode (no `service` prop)
 *   2. Renders pre-filled in edit mode (the `service` prop carries the
 *      current values)
 *   3. Validates client-side with Zod 4 (Spanish errors)
 *   4. The `depositAmount` field is rendered only when
 *      `paymentType === "DEPOSIT"`; switching to `NONE`/`FULL` hides it
 *   5. Submits via the matching Server Action (mocked) — `createService`
 *      when no `service` prop, `updateService` when in edit mode
 *   6. On success → toast + `router.replace()` to the detail page
 *   7. On error → inline error message above the form
 *
 * The Server Actions and the Next.js router are mocked so the test
 * stays pure RTL + jsdom. We render the form inside a small wrapper
 * to keep the same props shape used by the create / edit pages.
 *
 * Spec scenarios covered (from
 * `openspec/changes/services/specs/services-domain/spec.md`):
 * - `services-create` — depositAmount conditional on paymentType
 * - `services-create` — client-side validation rejects empty name
 * - `services-create` — successful create redirects to list
 * - `services-edit`   — pre-fills existing service data
 * - `services-edit`   — successful update redirects to detail
 * - `services-edit`   — server error displayed inline
 * - `services-form`   — invalid price / invalid duration client-side
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { EnrichedService } from "@/modules/services/data/service-data.types";
import {
  PaymentType,
  ServiceStatus,
} from "@/modules/services/domain/service";

// ---------------------------------------------------------------------------
// Mock declarations — Server Actions + Next.js router + toast.
// ---------------------------------------------------------------------------

const createServiceMock = vi.fn();
const updateServiceMock = vi.fn();
vi.mock(import("@/modules/services/actions"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createService: createServiceMock,
    updateService: updateServiceMock,
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
const { ServiceForm } = await import("@/components/services/service-form");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const SERVICE_ID = "00000000-0000-4000-8000-0000000000a1";
const ORG_ID = "00000000-0000-4000-8000-000000000001";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000b1";

const baseService: EnrichedService = {
  id: SERVICE_ID,
  organizationId: ORG_ID,
  name: "Consulta General",
  description: "Una consulta estándar",
  durationMinutes: 60,
  price: { amount: 2000, currency: "ARS" },
  depositAmount: { amount: 500, currency: "ARS" },
  paymentType: PaymentType.DEPOSIT,
  status: ServiceStatus.ACTIVE,
  professionalId: PROFESSIONAL_ID,
  professionalName: "Dr. García",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const baseProfessionals = [
  { id: PROFESSIONAL_ID, name: "Dr. García" },
  { id: "00000000-0000-4000-8000-0000000000b2", name: "Dra. López" },
];

function renderCreateForm(overrides: Partial<{ professionals: typeof baseProfessionals }> = {}) {
  return render(
    <ServiceForm
      mode="create"
      professionals={overrides.professionals ?? baseProfessionals}
    />,
  );
}

function renderEditForm(
  service: EnrichedService = baseService,
  overrides: Partial<{ professionals: typeof baseProfessionals }> = {},
) {
  return render(
    <ServiceForm
      mode="edit"
      service={service}
      professionals={overrides.professionals ?? baseProfessionals}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  createServiceMock.mockResolvedValue({
    success: true,
    data: { id: SERVICE_ID },
  });
  updateServiceMock.mockResolvedValue({ success: true });
});

// ---------------------------------------------------------------------------
// Pre-fill (edit mode)
// ---------------------------------------------------------------------------

describe("ServiceForm — pre-fill (edit mode)", () => {
  it("pre-fills the name input with the service name", () => {
    renderEditForm();
    const input = screen.getByLabelText(/^nombre/i) as HTMLInputElement;
    expect(input.value).toBe("Consulta General");
  });

  it("pre-fills the description textarea with the service description", () => {
    renderEditForm();
    const input = screen.getByLabelText(/descripci[oó]n/i) as HTMLTextAreaElement;
    expect(input.value).toBe("Una consulta estándar");
  });

  it("pre-fills the duration input with the service duration", () => {
    renderEditForm();
    const input = screen.getByLabelText(/duraci[oó]n/i) as HTMLInputElement;
    expect(input.value).toBe("60");
  });

  it("pre-fills the price input with the service price", () => {
    renderEditForm();
    const input = screen.getByLabelText(/^precio/i) as HTMLInputElement;
    expect(input.value).toBe("2000");
  });

  it("pre-fills the paymentType select with the service payment type", () => {
    renderEditForm();
    const select = screen.getByLabelText(/tipo de pago/i) as HTMLSelectElement;
    expect(select.value).toBe(PaymentType.DEPOSIT);
  });

  it("pre-fills the professionalId select with the service's professional", () => {
    renderEditForm();
    const select = screen.getByLabelText(/profesional/i) as HTMLSelectElement;
    expect(select.value).toBe(PROFESSIONAL_ID);
  });
});

// ---------------------------------------------------------------------------
// Create mode — empty defaults
// ---------------------------------------------------------------------------

describe("ServiceForm — create mode defaults", () => {
  it("renders the name input as empty", () => {
    renderCreateForm();
    const input = screen.getByLabelText(/^nombre/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("renders the description textarea as empty", () => {
    renderCreateForm();
    const input = screen.getByLabelText(/descripci[oó]n/i) as HTMLTextAreaElement;
    expect(input.value).toBe("");
  });

  it("renders the duration input with the default value 30", () => {
    renderCreateForm();
    const input = screen.getByLabelText(/duraci[oó]n/i) as HTMLInputElement;
    expect(input.value).toBe("30");
  });

  it("renders the price input as empty", () => {
    renderCreateForm();
    const input = screen.getByLabelText(/^precio/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("does not render the depositAmount field initially (paymentType=NONE default)", () => {
    renderCreateForm();
    // The label must NOT be in the document until the user picks DEPOSIT.
    expect(screen.queryByLabelText(/se[ñn]a/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Client-side validation
// ---------------------------------------------------------------------------

describe("ServiceForm — client-side validation", () => {
  it("shows 'El nombre es requerido' when name is cleared and submit is pressed", async () => {
    const user = userEvent.setup();
    renderEditForm();
    const input = screen.getByLabelText(/^nombre/i);
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(
      await screen.findByText(/el nombre es requerido/i),
    ).toBeInTheDocument();
    expect(updateServiceMock).not.toHaveBeenCalled();
  });

  it("shows 'La duración debe ser un número entero' when duration is not an integer", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    const duration = screen.getByLabelText(/duraci[oó]n/i);
    await user.clear(duration);
    await user.type(duration, "10.5");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(
      await screen.findByText(/duraci[oó]n debe ser un n[úu]mero entero/i),
    ).toBeInTheDocument();
    expect(createServiceMock).not.toHaveBeenCalled();
  });

  it("shows 'La duración debe ser un número positivo' when duration is zero", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    const duration = screen.getByLabelText(/duraci[oó]n/i);
    await user.clear(duration);
    await user.type(duration, "0");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(
      await screen.findByText(/duraci[oó]n debe ser un n[úu]mero positivo/i),
    ).toBeInTheDocument();
    expect(createServiceMock).not.toHaveBeenCalled();
  });

  it("shows 'El precio no puede ser negativo' when price is negative", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    const price = screen.getByLabelText(/^precio/i);
    await user.clear(price);
    await user.type(price, "-100");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(
      await screen.findByText(/precio no puede ser negativo/i),
    ).toBeInTheDocument();
    expect(createServiceMock).not.toHaveBeenCalled();
  });

  it("shows 'El precio debe tener como máximo 2 decimales' when price has more than 2 decimals", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    const price = screen.getByLabelText(/^precio/i);
    await user.clear(price);
    await user.type(price, "10.123");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(
      await screen.findByText(/m[áa]ximo 2 decimales/i),
    ).toBeInTheDocument();
    expect(createServiceMock).not.toHaveBeenCalled();
  });

  it("does NOT submit when client-side validation fails", async () => {
    const user = userEvent.setup();
    renderEditForm();
    const name = screen.getByLabelText(/^nombre/i);
    await user.clear(name);
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    // The error must render and the action must not be called.
    await screen.findByText(/el nombre es requerido/i);
    expect(updateServiceMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// depositAmount conditional rendering on paymentType
// ---------------------------------------------------------------------------

describe("ServiceForm — depositAmount conditional on paymentType", () => {
  it("renders the depositAmount field when paymentType=DEPOSIT", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    const select = screen.getByLabelText(/tipo de pago/i);
    await user.selectOptions(select, PaymentType.DEPOSIT);
    expect(screen.getByLabelText(/se[ñn]a/i)).toBeInTheDocument();
  });

  it("hides the depositAmount field when paymentType is NONE", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    const select = screen.getByLabelText(/tipo de pago/i);
    // Show the field by switching to DEPOSIT
    await user.selectOptions(select, PaymentType.DEPOSIT);
    expect(screen.getByLabelText(/se[ñn]a/i)).toBeInTheDocument();
    // Now switch to NONE — the field must disappear
    await user.selectOptions(select, PaymentType.NONE);
    expect(screen.queryByLabelText(/se[ñn]a/i)).not.toBeInTheDocument();
  });

  it("hides the depositAmount field when paymentType is FULL", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    const select = screen.getByLabelText(/tipo de pago/i);
    await user.selectOptions(select, PaymentType.DEPOSIT);
    expect(screen.getByLabelText(/se[ñn]a/i)).toBeInTheDocument();
    await user.selectOptions(select, PaymentType.FULL);
    expect(screen.queryByLabelText(/se[ñn]a/i)).not.toBeInTheDocument();
  });

  it("shows 'La seña es requerida...' when DEPOSIT is selected and the field is empty", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    const select = screen.getByLabelText(/tipo de pago/i);
    await user.selectOptions(select, PaymentType.DEPOSIT);
    // The deposit field is now visible but empty. The price also must be set
    // to satisfy "depositAmount must not exceed price" — set price first.
    const price = screen.getByLabelText(/^precio/i);
    await user.clear(price);
    await user.type(price, "2000");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(
      await screen.findByText(/se[ñn]a es requerida cuando el tipo de pago es deposit/i),
    ).toBeInTheDocument();
    expect(createServiceMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Valid submit
// ---------------------------------------------------------------------------

describe("ServiceForm — valid submit (create)", () => {
  it("calls createService with the form values on valid submit", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    await user.type(screen.getByLabelText(/^nombre/i), "Limpieza Dental");
    await user.type(
      screen.getByLabelText(/descripci[oó]n/i),
      "Limpieza completa",
    );
    const price = screen.getByLabelText(/^precio/i);
    await user.clear(price);
    await user.type(price, "3500");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await vi.waitFor(() => {
      expect(createServiceMock).toHaveBeenCalled();
    });
    const call = createServiceMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call).toMatchObject({
      name: "Limpieza Dental",
      description: "Limpieza completa",
      price: { amount: 3500, currency: "ARS" },
      paymentType: PaymentType.NONE,
      professionalId: PROFESSIONAL_ID,
    });
  });

  it("redirects to /dashboard/services/{newId} on successful create", async () => {
    const user = userEvent.setup();
    createServiceMock.mockResolvedValueOnce({
      success: true,
      data: { id: "new-service-id" },
    });
    renderCreateForm();
    await user.type(screen.getByLabelText(/^nombre/i), "Limpieza Dental");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/dashboard/services/new-service-id",
      );
    });
  });

  it("toasts success on a successful create", async () => {
    const user = userEvent.setup();
    renderCreateForm();
    await user.type(screen.getByLabelText(/^nombre/i), "Limpieza Dental");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await vi.waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it("displays the server error inline when the action returns an error", async () => {
    const user = userEvent.setup();
    createServiceMock.mockResolvedValueOnce({
      success: false,
      error: "Ya existe un servicio con ese nombre",
    });
    renderCreateForm();
    await user.type(screen.getByLabelText(/^nombre/i), "Limpieza Dental");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByText(/ya existe un servicio con ese nombre/i),
    ).toBeInTheDocument();
    // We must NOT have redirected.
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe("ServiceForm — valid submit (edit)", () => {
  it("calls updateService with the service id on valid submit", async () => {
    const user = userEvent.setup();
    renderEditForm();
    const name = screen.getByLabelText(/^nombre/i);
    await user.clear(name);
    await user.type(name, "Consulta General v2");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await vi.waitFor(() => {
      expect(updateServiceMock).toHaveBeenCalled();
    });
    const call = updateServiceMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call).toMatchObject({
      id: SERVICE_ID,
      name: "Consulta General v2",
    });
  });

  it("redirects to /dashboard/services/{id} on successful update", async () => {
    const user = userEvent.setup();
    renderEditForm();
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(`/dashboard/services/${SERVICE_ID}`);
    });
  });

  it("displays the server error inline when the action returns an error", async () => {
    const user = userEvent.setup();
    updateServiceMock.mockResolvedValueOnce({
      success: false,
      error: "Servicio no encontrado",
    });
    renderEditForm();
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByText(/servicio no encontrado/i),
    ).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cancel button
// ---------------------------------------------------------------------------

describe("ServiceForm — cancel link", () => {
  it("renders a Cancel link to /dashboard/services (create mode)", () => {
    renderCreateForm();
    const link = screen.getByRole("link", { name: /cancelar/i });
    expect(link).toHaveAttribute("href", "/dashboard/services");
  });

  it("renders a Cancel link to /dashboard/services/{id} (edit mode)", () => {
    renderEditForm();
    const link = screen.getByRole("link", { name: /cancelar/i });
    expect(link).toHaveAttribute("href", `/dashboard/services/${SERVICE_ID}`);
  });
});
