/**
 * Tests for the `PaymentStatusFilter` Client Component.
 *
 * Uses the shadcn/ui `Select` (Radix under the hood). The trigger is a
 * `<button role="combobox">`; options render in a portal with
 * `role="option"`. Selection flow: click trigger → click option.
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

import { PaymentStatusFilter } from "@/components/payments/payment-status-filter";

beforeEach(() => {
  pushMock.mockClear();
  currentParams = new URLSearchParams();
});

async function selectOption(label: string) {
  const user = userEvent.setup();
  const trigger = screen.getByTestId("payment-status-filter");
  await user.click(trigger);
  await user.click(screen.getByRole("option", { name: label }));
}

function currentDisplayText(): string {
  const trigger = screen.getByTestId("payment-status-filter");
  return trigger.textContent ?? "";
}

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------

describe("PaymentStatusFilter — initial render", () => {
  it("renders the six options: Todos, Pendiente, Aprobado, Rechazado, Cancelado, En proceso", async () => {
    const user = userEvent.setup();
    render(<PaymentStatusFilter />);

    const trigger = screen.getByTestId("payment-status-filter");
    await user.click(trigger);

    const options = screen.getAllByRole("option");
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
    expect(currentDisplayText()).toBe("Todos");
  });

  it("pre-selects PENDING when the URL has ?status=PENDING", () => {
    currentParams = new URLSearchParams("status=PENDING");
    render(<PaymentStatusFilter />);
    expect(currentDisplayText()).toBe("Pendiente");
  });

  it("pre-selects APPROVED when the URL has ?status=APPROVED", () => {
    currentParams = new URLSearchParams("status=APPROVED");
    render(<PaymentStatusFilter />);
    expect(currentDisplayText()).toBe("Aprobado");
  });
});

// ---------------------------------------------------------------------------
// Change handler
// ---------------------------------------------------------------------------

describe("PaymentStatusFilter — change handler", () => {
  it("pushes a URL with ?status=PENDING when PENDING is selected", async () => {
    render(<PaymentStatusFilter />);

    await selectOption("Pendiente");

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=PENDING");
    expect(arg).toMatch(/^\/dashboard\/payments/);
  });

  it("pushes a URL with ?status=APPROVED when APPROVED is selected", async () => {
    render(<PaymentStatusFilter />);

    await selectOption("Aprobado");

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=APPROVED");
  });

  it("removes ?status= when 'Todos' is selected", async () => {
    currentParams = new URLSearchParams("status=APPROVED");
    render(<PaymentStatusFilter />);

    await selectOption("Todos");

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).not.toContain("status=");
    expect(arg).toMatch(/^\/dashboard\/payments/);
  });

  it("resets ?page= to 1 when the filter changes (lands the user on page 1)", async () => {
    currentParams = new URLSearchParams("page=5&status=PENDING");
    render(<PaymentStatusFilter />);

    await selectOption("Aprobado");

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=APPROVED");
    expect(arg).not.toContain("page=5");
  });

  it("preserves other URL params (e.g. ?search=) when changing the filter", async () => {
    currentParams = new URLSearchParams("search=maria");
    render(<PaymentStatusFilter />);

    await selectOption("Pendiente");

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=maria");
    expect(arg).toContain("status=PENDING");
  });
});
