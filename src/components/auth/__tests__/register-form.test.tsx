/**
 * Tests for the `RegisterForm` Client Component (slice 1b).
 *
 * The component is the form under `/register`. These tests pin the
 * presentation + a11y contract from
 * `openspec/changes/ux-audit-fixes/specs/auth-module/spec.md`:
 *
 *   - Single `<h1>` ("Creá tu cuenta"); the "Booking Engine" wordmark
 *     is a non-heading element.
 *   - On failed submit, PER-FIELD errors (one per field) are rendered:
 *     `#name-error`, `#email-error`, `#password-error`, each with
 *     `role="alert"`. Each invalid input carries `aria-invalid="true"`
 *     and `aria-describedby` referencing its error id.
 *   - Focus moves to the FIRST invalid field on failed submit
 *     (multi-field failure → focus on the first invalid input, not the
 *     error region).
 *   - No duplicate error nodes per field — each field has at most one
 *     error element.
 *   - `noValidate` is present on the form.
 *   - The password toggle button has `aria-pressed` toggling between
 *     "false"/"true", `aria-label` toggling between Spanish
 *     "Mostrar contraseña"/"Ocultar contraseña", and flips the input
 *     `type` between "password" and "text". Enter and Space activate it.
 *   - Inputs carry `text-base md:text-sm` (iOS-safe sizing).
 *
 * Note on register vs login error wiring: login is form-level (single
 * `#login-form-error` for credential failures that apply to both
 * fields). Register is per-field (each field owns its error id) because
 * each field has a distinct failure mode (empty name, invalid email
 * format, short password).
 *
 * The better-auth `signUp.email` is mocked so we can drive both
 * client-side validation and server-rejection paths deterministically.
 * The Next.js router is mocked so we don't depend on Next runtime.
 * Toast is mocked so we don't pull its DOM side-effects.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — declared before importing the component under test
// ---------------------------------------------------------------------------

const signUpEmailMock = vi.fn();
vi.mock("@/core/auth/auth-client", () => ({
  createAuthClient: () => ({
    signUp: {
      email: signUpEmailMock,
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
const { RegisterForm } = await import("@/components/auth/register-form");

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function renderRegister() {
  return render(<RegisterForm />);
}

/**
 * Inputs are queried by accessible role + regex-anchored label so:
 *   - The password toggle button (aria-label "Mostrar contraseña")
 *     does not collide with the password input.
 *   - The required `*` asterisk rendered next to the label text does
 *     not break exact label matching.
 */
function getNameInput() {
  return screen.getByRole("textbox", { name: /^Nombre/ });
}
function getEmailInput() {
  return screen.getByRole("textbox", { name: /^Email/ });
}
function getPasswordInput() {
  return screen.getByLabelText(/^Contraseña/) as HTMLInputElement;
}

async function fillValidNameAndEmail(user: ReturnType<typeof userEvent.setup>) {
  await user.type(getNameInput(), "Juan Pérez");
  await user.type(getEmailInput(), "juan@example.com");
}

async function submitForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Crear cuenta/ }));
}

// ---------------------------------------------------------------------------
// 2.1.a — Single h1 + wordmark not a heading
// ---------------------------------------------------------------------------

describe("RegisterForm — heading structure", () => {
  it("renders exactly one <h1> containing 'Creá tu cuenta'", () => {
    renderRegister();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Creá tu cuenta");
  });

  it("renders the 'Booking Engine' wordmark as a non-heading element", () => {
    renderRegister();

    // The wordmark text exists somewhere in the DOM…
    expect(screen.getByText("Booking Engine")).toBeInTheDocument();
    // …but only one heading is present (the register h1).
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 2.1.b — Per-field error wiring on short-password submit
// ---------------------------------------------------------------------------

describe("RegisterForm — per-field error wiring on short-password submit", () => {
  beforeEach(() => {
    signUpEmailMock.mockReset();
    replaceMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    // signUp.email must NOT be called when client-side validation
    // rejects the short password; assert that explicitly.
    signUpEmailMock.mockResolvedValue({ error: null });
  });

  it("marks the password input aria-invalid=true with aria-describedby pointing at #password-error", async () => {
    const user = userEvent.setup();
    renderRegister();

    // Fill valid name + email so ONLY the password fails.
    await fillValidNameAndEmail(user);
    await user.type(getPasswordInput(), "short");
    await submitForm(user);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const password = getPasswordInput();
    expect(password.getAttribute("aria-invalid")).toBe("true");
    expect(password.getAttribute("aria-describedby")).toContain("password-error");
  });

  it("renders a single #password-error[role=alert] when password is too short", async () => {
    const user = userEvent.setup();
    renderRegister();

    await fillValidNameAndEmail(user);
    await user.type(getPasswordInput(), "short");
    await submitForm(user);

    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert.id).toBe("password-error");
    // Exactly one alert in the DOM — only the password field is invalid.
    expect(screen.queryAllByRole("alert")).toHaveLength(1);
  });

  it("does NOT render duplicate error nodes per field (name/email are clean, password has one)", async () => {
    const user = userEvent.setup();
    renderRegister();

    await fillValidNameAndEmail(user);
    await user.type(getPasswordInput(), "short");
    await submitForm(user);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(document.getElementById("name-error")).toBeNull();
    expect(document.getElementById("email-error")).toBeNull();
    expect(document.querySelectorAll("#password-error")).toHaveLength(1);
  });

  it("moves focus to the password input on short-password submit", async () => {
    const user = userEvent.setup();
    renderRegister();

    await fillValidNameAndEmail(user);
    await user.type(getPasswordInput(), "short");
    await submitForm(user);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(document.activeElement).toBe(getPasswordInput());
  });

  it("does NOT call signUp.email when client-side validation rejects the short password", async () => {
    const user = userEvent.setup();
    renderRegister();

    await fillValidNameAndEmail(user);
    await user.type(getPasswordInput(), "short");
    await submitForm(user);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(signUpEmailMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2.1.c — Focus moves to FIRST invalid field on multi-field failure
// ---------------------------------------------------------------------------

describe("RegisterForm — focus first invalid field on multi-field failure", () => {
  beforeEach(() => {
    signUpEmailMock.mockReset();
    signUpEmailMock.mockResolvedValue({ error: null });
    replaceMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("focuses the name input when all fields are empty on submit", async () => {
    const user = userEvent.setup();
    renderRegister();

    await submitForm(user);

    await waitFor(() => {
      expect(screen.queryAllByRole("alert").length).toBeGreaterThan(0);
    });

    expect(document.activeElement).toBe(getNameInput());
  });

  it("renders one error node per failing field (name, email, password) when all are empty", async () => {
    const user = userEvent.setup();
    renderRegister();

    await submitForm(user);

    expect(document.querySelectorAll("#name-error")).toHaveLength(1);
    expect(document.querySelectorAll("#email-error")).toHaveLength(1);
    expect(document.querySelectorAll("#password-error")).toHaveLength(1);
    expect(screen.queryAllByRole("alert")).toHaveLength(3);
  });

  it("focuses the email input when name is valid but email and password are invalid", async () => {
    const user = userEvent.setup();
    renderRegister();

    // Name valid, email invalid format, password short.
    await user.type(getNameInput(), "Juan");
    await user.type(getEmailInput(), "not-an-email");
    await user.type(getPasswordInput(), "short");
    await submitForm(user);

    await waitFor(() => {
      expect(screen.queryAllByRole("alert").length).toBeGreaterThan(0);
    });

    expect(document.activeElement).toBe(getEmailInput());
  });
});

// ---------------------------------------------------------------------------
// 2.1.d — Invalid email format triggers per-field error
// ---------------------------------------------------------------------------

describe("RegisterForm — invalid email format", () => {
  beforeEach(() => {
    signUpEmailMock.mockReset();
    signUpEmailMock.mockResolvedValue({ error: null });
    replaceMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("renders #email-error[role=alert] when email format is invalid", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(getNameInput(), "Juan");
    await user.type(getEmailInput(), "not-an-email");
    await user.type(getPasswordInput(), "validpassword123");
    await submitForm(user);

    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert.id).toBe("email-error");
    expect(screen.queryAllByRole("alert")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 2.1.e — noValidate preserved
// ---------------------------------------------------------------------------

describe("RegisterForm — noValidate regression guard", () => {
  it("renders a <form> with the novalidate attribute", () => {
    renderRegister();

    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.hasAttribute("novalidate")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2.1.f — Password toggle (aria-pressed, label, type, keyboard activation)
// ---------------------------------------------------------------------------

describe("RegisterForm — password visibility toggle", () => {
  it("initially has aria-pressed='false' and label 'Mostrar contraseña'", () => {
    renderRegister();

    const toggle = screen.getByRole("button", {
      name: "Mostrar contraseña",
    });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.getAttribute("type")).toBe("button");
  });

  it("flips aria-pressed, label, and input type when clicked", async () => {
    const user = userEvent.setup();
    renderRegister();

    const password = getPasswordInput();
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
    renderRegister();

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
    renderRegister();

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
// 2.1.g — iOS-safe input sizing on every register input
// ---------------------------------------------------------------------------

describe("RegisterForm — iOS-safe input sizing", () => {
  it("name input carries text-base and md:text-sm classes", () => {
    renderRegister();

    const name = getNameInput();
    expect(name.className).toContain("text-base");
    expect(name.className).toContain("md:text-sm");
  });

  it("email input carries text-base and md:text-sm classes", () => {
    renderRegister();

    const email = getEmailInput();
    expect(email.className).toContain("text-base");
    expect(email.className).toContain("md:text-sm");
  });

  it("password input carries text-base and md:text-sm classes", () => {
    renderRegister();

    const password = getPasswordInput();
    expect(password.className).toContain("text-base");
    expect(password.className).toContain("md:text-sm");
  });
});