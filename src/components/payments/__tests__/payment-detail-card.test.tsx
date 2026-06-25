/**
 * Tests for the `PaymentDetailCard` Client Component.
 *
 * Renders the full detail view of a single payment:
 *   - Amount (formatted as ARS via formatCurrency)
 *   - Status badge (PaymentStatusBadge)
 *   - Provider
 *   - Retry count
 *   - Preference id + external reference
 *   - Booking info: startTime, patient, professional, service
 *   - Business status (mapped via mapProviderToBusinessStatus)
 *   - Retry button (visible only when canRetry is true)
 *   - "Ver reserva" link to /dashboard/bookings/[id]
 *   - "Pago padre" / "Pago hijo" link when parentPaymentId is set
 *
 * The Server Action (`retryPayment`) and the Next.js router are
 * mocked so the test stays pure RTL + jsdom.
 *
 * Spec scenarios covered (from
 * `openspec/changes/payments/specs/payments-presentation/spec.md`):
 * - payments-presentation — Detail renders enriched payment (amount
 *   formatted, status badge, patient, professional, service, retry
 *   count, "Ver reserva" link).
 * - payments-presentation — Detail 404 for nonexistent payment
 *   (handled by page).
 * - payments-presentation — Retry button hidden when canRetry false.
 * - payments-presentation — Retry button triggers action and
 *   revalidates.
 * - payments-presentation — Retry button shows error toast on
 *   failure.
 * - payments-presentation — Detail shows parent-child relationship
 *   for DEPOSIT (Pago padre / Pago hijo labels and link).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  ProviderPaymentStatus,
  type ProviderPaymentStatusType,
} from "@/modules/payments/domain/payment";
import type { EnrichedPayment } from "@/modules/payments/data/payment-data.types";

// ---------------------------------------------------------------------------
// Mock declarations — Server Actions + Next.js router + toast.
// ---------------------------------------------------------------------------

const retryPaymentMock = vi.fn();
vi.mock(import("@/modules/payments/actions"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    retryPayment: retryPaymentMock,
  };
});

const refreshMock = vi.fn();
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
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
const { PaymentDetailCard } = await import(
  "@/components/payments/payment-detail-card"
);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const PAYMENT_ID = "00000000-0000-4000-8000-0000000000c1";
const PARENT_PAYMENT_ID = "00000000-0000-4000-8000-0000000000c0";
const BOOKING_ID = "00000000-0000-4000-8000-0000000000b1";
const ORG_ID = "00000000-0000-4000-8000-000000000001";

function makePayment(
  overrides: Partial<EnrichedPayment> = {},
): EnrichedPayment {
  return {
    id: PAYMENT_ID,
    organizationId: ORG_ID,
    bookingId: BOOKING_ID,
    provider: "MERCADOPAGO",
    status: ProviderPaymentStatus.PENDING,
    amount: 5000,
    preferenceId: "pref-123",
    externalReference: "ext-456",
    retryCount: 0,
    parentPaymentId: undefined,
    createdAt: new Date("2026-06-20T10:00:00Z"),
    updatedAt: new Date("2026-06-20T10:00:00Z"),
    bookingStartTime: new Date("2026-06-25T14:00:00Z"),
    patientName: "María González",
    professionalName: "Dr. García",
    serviceName: "Consulta general",
    servicePaymentType: "FULL",
    businessStatus: "PENDING",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  retryPaymentMock.mockResolvedValue({
    success: true,
    data: makePayment({ status: ProviderPaymentStatus.PENDING }),
  });
});

// ---------------------------------------------------------------------------
// Render info
// ---------------------------------------------------------------------------

describe("PaymentDetailCard — render info", () => {
  it("renders the formatted amount in Argentinian pesos", () => {
    render(<PaymentDetailCard payment={makePayment({ amount: 5000 })} canRetry />);
    // Amount appears in the heading AND in the "Monto y proveedor" card
    expect(screen.getAllByText(/\$ 5\.000,00/).length).toBeGreaterThan(0);
  });

  it("renders the provider label 'MercadoPago'", () => {
    render(<PaymentDetailCard payment={makePayment()} canRetry />);
    expect(screen.getByText("MercadoPago")).toBeInTheDocument();
  });

  it("renders the preference id when set", () => {
    render(<PaymentDetailCard payment={makePayment({ preferenceId: "pref-123" })} canRetry />);
    expect(screen.getByText("pref-123")).toBeInTheDocument();
  });

  it("renders the external reference when set", () => {
    render(<PaymentDetailCard payment={makePayment({ externalReference: "ext-456" })} canRetry />);
    expect(screen.getByText("ext-456")).toBeInTheDocument();
  });

  it("renders the patient name", () => {
    render(<PaymentDetailCard payment={makePayment({ patientName: "María González" })} canRetry />);
    expect(screen.getByText("María González")).toBeInTheDocument();
  });

  it("renders the professional name", () => {
    render(<PaymentDetailCard payment={makePayment({ professionalName: "Dr. García" })} canRetry />);
    expect(screen.getByText("Dr. García")).toBeInTheDocument();
  });

  it("renders the service name", () => {
    render(<PaymentDetailCard payment={makePayment({ serviceName: "Consulta general" })} canRetry />);
    expect(screen.getByText("Consulta general")).toBeInTheDocument();
  });

  it("renders the status badge with 'Pendiente' for PENDING", () => {
    render(
      <PaymentDetailCard
        payment={makePayment({ status: ProviderPaymentStatus.PENDING })}
        canRetry
      />,
    );
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
  });

  it("renders all 5 status badges correctly", () => {
    const allStatuses: ProviderPaymentStatusType[] = [
      ProviderPaymentStatus.PENDING,
      ProviderPaymentStatus.APPROVED,
      ProviderPaymentStatus.REJECTED,
      ProviderPaymentStatus.CANCELLED,
      ProviderPaymentStatus.IN_PROCESS,
    ];
    for (const status of allStatuses) {
      const { unmount } = render(
        <PaymentDetailCard
          payment={makePayment({ status })}
          canRetry={false}
        />,
      );
      const expectedLabel: Record<ProviderPaymentStatusType, string> = {
        PENDING: "Pendiente",
        APPROVED: "Aprobado",
        REJECTED: "Rechazado",
        CANCELLED: "Cancelado",
        IN_PROCESS: "En proceso",
      };
      expect(screen.getAllByText(expectedLabel[status]).length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("renders a 'Ver reserva' link to the booking detail page", () => {
    render(<PaymentDetailCard payment={makePayment()} canRetry />);
    const link = screen.getByRole("link", { name: /ver reserva/i });
    expect(link).toHaveAttribute("href", `/dashboard/bookings/${BOOKING_ID}`);
  });
});

// ---------------------------------------------------------------------------
// Retry button — visibility (canRetry)
// ---------------------------------------------------------------------------

describe("PaymentDetailCard — retry button visibility (canRetry)", () => {
  it("renders the 'Reintentar pago' button when canRetry is true", () => {
    render(
      <PaymentDetailCard
        payment={makePayment({ status: ProviderPaymentStatus.REJECTED, retryCount: 0 })}
        canRetry
      />,
    );
    expect(
      screen.getByRole("button", { name: /reintentar pago/i }),
    ).toBeInTheDocument();
  });

  it("does NOT render the retry button when canRetry is false", () => {
    render(
      <PaymentDetailCard
        payment={makePayment({ status: ProviderPaymentStatus.APPROVED, retryCount: 0 })}
        canRetry={false}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /reintentar pago/i }),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Retry button — action wiring
// ---------------------------------------------------------------------------

describe("PaymentDetailCard — retry button action", () => {
  it("calls retryPayment with the payment id when clicked", async () => {
    const user = userEvent.setup();
    render(
      <PaymentDetailCard
        payment={makePayment({
          id: PAYMENT_ID,
          status: ProviderPaymentStatus.REJECTED,
          retryCount: 1,
        })}
        canRetry
      />,
    );

    const retryButton = screen.getByRole("button", { name: /reintentar pago/i });
    await user.click(retryButton);

    await vi.waitFor(() => {
      expect(retryPaymentMock).toHaveBeenCalledWith({ paymentId: PAYMENT_ID });
    });
  });

  it("toasts success and refreshes the page on a successful retry", async () => {
    const user = userEvent.setup();
    render(
      <PaymentDetailCard
        payment={makePayment({ status: ProviderPaymentStatus.REJECTED })}
        canRetry
      />,
    );
    const retryButton = screen.getByRole("button", { name: /reintentar pago/i });
    await user.click(retryButton);

    await vi.waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("toasts the server error and does NOT refresh on a failed retry", async () => {
    const user = userEvent.setup();
    retryPaymentMock.mockResolvedValueOnce({
      success: false,
      error: "No se puede reintentar este pago",
    });
    render(
      <PaymentDetailCard
        payment={makePayment({ status: ProviderPaymentStatus.REJECTED })}
        canRetry
      />,
    );
    const retryButton = screen.getByRole("button", { name: /reintentar pago/i });
    await user.click(retryButton);

    await vi.waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "No se puede reintentar este pago",
      );
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Parent-child relationship
// ---------------------------------------------------------------------------

describe("PaymentDetailCard — parent-child relationship", () => {
  it("renders 'Pago hijo' label and a link to the parent payment when parentPaymentId is set", () => {
    render(
      <PaymentDetailCard
        payment={makePayment({ parentPaymentId: PARENT_PAYMENT_ID })}
        canRetry={false}
      />,
    );
    expect(screen.getByText(/pago hijo/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /pago padre|pago hijo/i });
    expect(link).toHaveAttribute("href", `/dashboard/payments/${PARENT_PAYMENT_ID}`);
  });

  it("does NOT render the parent-child section when parentPaymentId is undefined", () => {
    render(
      <PaymentDetailCard
        payment={makePayment({ parentPaymentId: undefined })}
        canRetry={false}
      />,
    );
    expect(screen.queryByText(/pago hijo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pago padre/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Back link
// ---------------------------------------------------------------------------

describe("PaymentDetailCard — back link", () => {
  it("renders a back link to /dashboard/payments", () => {
    render(<PaymentDetailCard payment={makePayment()} canRetry={false} />);
    const link = screen.getByRole("link", { name: /volver al listado/i });
    expect(link).toHaveAttribute("href", "/dashboard/payments");
  });
});
