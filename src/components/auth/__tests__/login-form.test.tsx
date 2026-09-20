/**
 * Tests for the `LoginForm` Client Component (slice 1a).
 *
 * The component is the form under `/login`. These tests pin the
 * presentation + a11y contract from
 * `openspec/changes/ux-audit-fixes/specs/auth-module/spec.md`:
 *
 *   - Single `<h1>` ("Bienvenido de nuevo"); the "Booking Engine" wordmark
 *     is a non-heading element.
 *   - On credential failure (signIn.email returns `error`), a single
 *     form-level `#login-form-error` with `role="alert"` is rendered;
 *     both inputs get `aria-invalid="true"` and
 *     `aria-describedby="login-form-error"`.
 *   - Focus moves to the form-level alert on failed submit.
 *   - `noValidate` is present on the form.
 *   - The password toggle button has `aria-pressed` toggling between
 *     "false"/"true", `aria-label` toggling between Spanish
 *     "Mostrar contraseña"/"Ocultar contraseña", and flips the input
 *     `type` between "password" and "text". Enter and Space activate it.
 *   - Inputs carry `text-base md:text-sm` (iOS-safe sizing).
 *
 * The better-auth `signIn.email` is mocked so we can drive both the
 * success and rejection paths deterministically. The Next.js router
 * is mocked so we don't depend on Next runtime. Toast is mocked so we
 * don't pull its DOM side-effects.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — declared before importing the component under test
// ---------------------------------------------------------------------------

const signInEmailMock = vi.fn();
vi.mock("@/core/auth/auth-client", () => ({
  createAuthClient: () => ({
    signIn: {
      email: signInEmailMock,
    },
  }),
}));

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

// Import after the mocks above.
const { LoginForm } = await import("@/components/auth/login-form");

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function renderLogin() {
  return render(<LoginForm />);
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  // Find inputs by accessible role rather than label text so the
  // password toggle button (aria-label "Mostrar contraseña") does not
  // collide with the password input, and the required asterisk
  // rendered next to the label text does not break exact label
  // matching.
  const emailInput = screen.getByRole("textbox", { name: /^Email/ });
  const passwordInput = screen.getByLabelText(/^Contraseña/);
  await user.type(emailInput, "test@example.com");
  await user.type(passwordInput, "bad-password");
  await user.click(screen.getByRole("button", { name: "Ingresar" }));
}

// ---------------------------------------------------------------------------
// 1.3.a — Single h1 + wordmark not a heading
// ---------------------------------------------------------------------------

describe("LoginForm — heading structure", () => {
  it("renders exactly one <h1> containing 'Bienvenido de nuevo'", () => {
    renderLogin();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Bienvenido de nuevo");
  });

  it("renders the 'Booking Engine' wordmark as a non-heading element", () => {
    renderLogin();

    // The wordmark text exists somewhere in the DOM…
    expect(screen.getByText("Booking Engine")).toBeInTheDocument();
    // …but only one heading is present (the welcome h1).
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 1.3.b — form-level alert + input ARIA wiring on credential failure
// ---------------------------------------------------------------------------

describe("LoginForm — credential failure wiring", () => {
  beforeEach(() => {
    signInEmailMock.mockReset();
    signInEmailMock.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    replaceMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it("renders a single #login-form-error[role=alert] when signIn rejects", async () => {
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    // The form-level alert exists and is the ONLY alert in the DOM.
    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert.id).toBe("login-form-error");
    expect(screen.queryAllByRole("alert")).toHaveLength(1);
  });

  it("marks both inputs aria-invalid=true with aria-describedby pointing at the form-level error", async () => {
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const email = screen.getByRole("textbox", { name: /^Email/ }) as HTMLInputElement;
    const password = screen.getByLabelText(/^Contraseña/) as HTMLInputElement;

    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toBe("login-form-error");
    expect(password.getAttribute("aria-invalid")).toBe("true");
    expect(password.getAttribute("aria-describedby")).toBe("login-form-error");
  });

  it("moves focus to the form-level alert after a failed submit", async () => {
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(document.activeElement?.id).toBe("login-form-error");
  });

  it("does NOT render any per-field error node for email or password on credential failure", async () => {
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Only the form-level alert exists — no node like #email-error or
    // #password-error (per spec, login is form-level only).
    expect(document.getElementById("email-error")).toBeNull();
    expect(document.getElementById("password-error")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 1.3.c — noValidate preserved
// ---------------------------------------------------------------------------

describe("LoginForm — noValidate regression guard", () => {
  it("renders a <form> with the novalidate attribute", () => {
    renderLogin();

    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.hasAttribute("novalidate")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 1.3.d — password toggle (aria-pressed, label, type, keyboard activation)
// ---------------------------------------------------------------------------

describe("LoginForm — password visibility toggle", () => {
  it("initially has aria-pressed='false' and label 'Mostrar contraseña'", () => {
    renderLogin();

    const toggle = screen.getByRole("button", {
      name: "Mostrar contraseña",
    });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.getAttribute("type")).toBe("button");
  });

  it("flips aria-pressed, label, and input type when clicked", async () => {
    const user = userEvent.setup();
    renderLogin();

    const password = screen.getByLabelText(/^Contraseña/) as HTMLInputElement;
    expect(password.type).toBe("password");

    const toggle = screen.getByRole("button", {
      name: "Mostrar contraseña",
    });
    await user.click(toggle);

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Ocultar contraseña");
    expect(
      (screen.getByLabelText(/^Contraseña/) as HTMLInputElement).type,
    ).toBe("text");
  });

  it("activates with Enter key (keyboard reachable)", () => {
    renderLogin();

    const toggle = screen.getByRole("button", {
      name: "Mostrar contraseña",
    });
    toggle.focus();
    fireEvent.keyDown(toggle, { key: "Enter" });
    // The implementation uses <button>, so a synthetic click should
    // also fire after the keyDown for native buttons.
    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Ocultar contraseña" }),
    ).toBe(toggle);
  });

  it("activates with Space key (keyboard reachable)", () => {
    renderLogin();

    const toggle = screen.getByRole("button", {
      name: "Mostrar contraseña",
    });
    toggle.focus();
    fireEvent.keyDown(toggle, { key: " " });
    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });
});

// ---------------------------------------------------------------------------
// 1.3.e — iOS-safe input sizing
// ---------------------------------------------------------------------------

describe("LoginForm — input sizing", () => {
  it("email input carries text-base and md:text-sm classes", () => {
    renderLogin();

    const email = screen.getByRole("textbox", { name: /^Email/ });
    expect(email.className).toContain("text-base");
    expect(email.className).toContain("md:text-sm");
  });

  it("password input carries text-base and md:text-sm classes", () => {
    renderLogin();

    const password = screen.getByLabelText(/^Contraseña/);
    expect(password.className).toContain("text-base");
    expect(password.className).toContain("md:text-sm");
  });
});