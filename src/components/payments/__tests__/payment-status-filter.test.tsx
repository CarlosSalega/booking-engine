/**
 * Tests for the `PaymentStatusFilter` Client Component.
 *
 * Mirrors the `ProfessionalStatusFilter` test strategy: render the
 * component, simulate a `change` event on the native `<select>` and
 * assert that `router.push` was called with the right URL (with the
 * new `?status=...` param + `?page=` reset).
 *
 * Spec scenarios covered (from
 * `openspec/changes/payments/specs/payments-presentation/spec.md`):
 * - payments-presentation — Status filter: `<PaymentStatusFilter>`
 *   Client Component dropdown with all `ProviderPaymentStatus`
 *   values.
 * - Filter changes reset pagination to page 1.
 * - The current `?status=` value is pre-populated from the URL.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
let currentParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => currentParams,
}));

import { ProviderPaymentStatus } from "@/modules/payments/domain/payment";
import { PaymentStatusFilter } from "@/components/payments/payment-status-filter";

beforeEach(() => {
  pushMock.mockClear();
  currentParams = new URLSearchParams();
});

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------

describe("PaymentStatusFilter — initial render", () => {
  it("renders the six options: Todos, Pendiente, Aprobado, Rechazado, Cancelado, En proceso", () => {
    render(<PaymentStatusFilter />);
    const select = screen.getByTestId("payment-status-filter");
    const options = Array.from(select.querySelectorAll("option"));
    const labels = options.map((o) => o.textContent);
    expect(labels).toEqual([
      "Todos",
      "Pendiente",
      "Aprobado",
      "Rechazado",
      "Cancelado",
      "En proceso",
    ]);
  });

  it("pre-selects 'Todos' when the URL has no ?status param", () => {
    render(<PaymentStatusFilter />);
    const select = screen.getByTestId(
      "payment-status-filter",
    ) as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("pre-selects PENDING when the URL has ?status=PENDING", () => {
    currentParams = new URLSearchParams("status=PENDING");
    render(<PaymentStatusFilter />);
    const select = screen.getByTestId(
      "payment-status-filter",
    ) as HTMLSelectElement;
    expect(select.value).toBe(ProviderPaymentStatus.PENDING);
  });

  it("pre-selects APPROVED when the URL has ?status=APPROVED", () => {
    currentParams = new URLSearchParams("status=APPROVED");
    render(<PaymentStatusFilter />);
    const select = screen.getByTestId(
      "payment-status-filter",
    ) as HTMLSelectElement;
    expect(select.value).toBe(ProviderPaymentStatus.APPROVED);
  });
});

// ---------------------------------------------------------------------------
// Change handler
// ---------------------------------------------------------------------------

describe("PaymentStatusFilter — change handler", () => {
  it("pushes a URL with ?status=PENDING when PENDING is selected", async () => {
    const user = userEvent.setup();
    render(<PaymentStatusFilter />);
    const select = screen.getByTestId("payment-status-filter");

    await user.selectOptions(select, ProviderPaymentStatus.PENDING);

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=PENDING");
    expect(arg).toMatch(/^\/dashboard\/payments/);
  });

  it("pushes a URL with ?status=APPROVED when APPROVED is selected", async () => {
    const user = userEvent.setup();
    render(<PaymentStatusFilter />);
    const select = screen.getByTestId("payment-status-filter");

    await user.selectOptions(select, ProviderPaymentStatus.APPROVED);

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=APPROVED");
  });

  it("removes ?status= when 'Todos' is selected", async () => {
    const user = userEvent.setup();
    currentParams = new URLSearchParams("status=APPROVED");
    render(<PaymentStatusFilter />);
    const select = screen.getByTestId("payment-status-filter");

    await user.selectOptions(select, "");

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).not.toContain("status=");
    expect(arg).toMatch(/^\/dashboard\/payments/);
  });

  it("resets ?page= to 1 when the filter changes (lands the user on page 1)", async () => {
    const user = userEvent.setup();
    currentParams = new URLSearchParams("page=5&status=PENDING");
    render(<PaymentStatusFilter />);
    const select = screen.getByTestId("payment-status-filter");

    await user.selectOptions(select, ProviderPaymentStatus.APPROVED);

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=APPROVED");
    expect(arg).not.toContain("page=5");
  });

  it("preserves other URL params (e.g. ?search=) when changing the filter", async () => {
    const user = userEvent.setup();
    currentParams = new URLSearchParams("search=maria");
    render(<PaymentStatusFilter />);
    const select = screen.getByTestId("payment-status-filter");

    await user.selectOptions(select, ProviderPaymentStatus.PENDING);

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=maria");
    expect(arg).toContain("status=PENDING");
  });
});
