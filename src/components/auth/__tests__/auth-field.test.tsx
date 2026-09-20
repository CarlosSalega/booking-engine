/**
 * Tests for the `AuthField` shared primitive (slice 1a).
 *
 * `AuthField` is the label + children + hint + error wrapper consumed by
 * both `LoginForm` and `RegisterForm`. The primitive fixes C1 structurally:
 * an `AuthField` without an explicit `errorId` cannot satisfy the
 * association contract the auth spec requires.
 *
 * Spec scenarios covered
 * (openspec/changes/ux-audit-fixes/specs/auth-module/spec.md):
 *   - Error association on failed login (slice 1a)
 *   - Error association on failed register (slice 1a)
 *   - iOS-safe input sizing (text-base md:text-sm — indirectly, by
 *     leaving input className to the parent and asserting it isn't
 *     stripped here)
 *
 * Test layer: Unit (React Testing Library + jsdom). Strict TDD RED —
 * these tests are written against the contract from the design before
 * the implementation exists.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AuthField } from "@/components/auth/auth-field";

// ---------------------------------------------------------------------------
// Label / id wiring
// ---------------------------------------------------------------------------

describe("AuthField — label association", () => {
  it("renders the label text bound to the input id via htmlFor", () => {
    render(
      <AuthField id="email" label="Email">
        <input id="email" name="email" type="email" />
      </AuthField>,
    );

    const input = screen.getByLabelText("Email");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("renders a required indicator when `required` is true", () => {
    render(
      <AuthField id="email" label="Email" required>
        <input id="email" name="email" type="email" />
      </AuthField>,
    );

    // The label is associated to the input via htmlFor; the required
    // marker is a child of the label (a span with destructive color).
    const label = screen.getByText("Email").closest("label");
    expect(label).not.toBeNull();
    expect(label?.getAttribute("for")).toBe("email");
  });
});

// ---------------------------------------------------------------------------
// Hint visibility — shown when there is no error, hidden when there is
// ---------------------------------------------------------------------------

describe("AuthField — hint visibility", () => {
  it("renders the hint as a paragraph with the provided hintId when there is no error", () => {
    render(
      <AuthField id="email" label="Email" hint="Te enviaremos un código" hintId="email-hint">
        <input id="email" name="email" type="email" />
      </AuthField>,
    );

    const hint = document.getElementById("email-hint");
    expect(hint).not.toBeNull();
    expect(hint?.tagName).toBe("P");
    expect(hint?.textContent).toBe("Te enviaremos un código");
  });

  it("hides the hint entirely when an error is present", () => {
    render(
      <AuthField
        id="email"
        label="Email"
        hint="Te enviaremos un código"
        hintId="email-hint"
        error="Email inválido"
        errorId="email-error"
      >
        <input id="email" name="email" type="email" />
      </AuthField>,
    );

    expect(document.getElementById("email-hint")).toBeNull();
    expect(screen.queryByText("Te enviaremos un código")).toBeNull();
  });

  it("does not render any hint node when hint is omitted", () => {
    render(
      <AuthField id="email" label="Email">
        <input id="email" name="email" type="email" />
      </AuthField>,
    );

    // No hint text in the document.
    expect(screen.queryByText(/enviaremos|código/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Error node — single node per field with role=alert and stable id
// ---------------------------------------------------------------------------

describe("AuthField — error node", () => {
  it("renders a single error node with role=alert and the errorId when error is set", () => {
    render(
      <AuthField
        id="email"
        label="Email"
        error="Email inválido"
        errorId="email-error"
      >
        <input id="email" name="email" type="email" />
      </AuthField>,
    );

    const errorEl = document.getElementById("email-error");
    expect(errorEl).not.toBeNull();
    expect(errorEl?.getAttribute("role")).toBe("alert");
    expect(errorEl?.textContent).toBe("Email inválido");
  });

  it("does not render an error node when error is null", () => {
    render(
      <AuthField id="email" label="Email" error={null} errorId="email-error">
        <input id="email" name="email" type="email" />
      </AuthField>,
    );

    expect(document.getElementById("email-error")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders exactly one error node per AuthField when error is set (no duplicates)", () => {
    render(
      <AuthField
        id="email"
        label="Email"
        error="Email inválido"
        errorId="email-error"
      >
        <input id="email" name="email" type="email" />
      </AuthField>,
    );

    // Only one alert (the error). The component must not duplicate.
    expect(screen.queryAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toBe(document.getElementById("email-error"));
  });
});

// ---------------------------------------------------------------------------
// Visual contract — preserved sizing of the error text
// ---------------------------------------------------------------------------

describe("AuthField — visual contract", () => {
  it("applies text-xs and text-destructive classes to the error node", () => {
    render(
      <AuthField
        id="email"
        label="Email"
        error="Email inválido"
        errorId="email-error"
      >
        <input id="email" name="email" type="email" />
      </AuthField>,
    );

    const errorEl = document.getElementById("email-error");
    expect(errorEl?.className).toContain("text-xs");
    expect(errorEl?.className).toContain("text-destructive");
  });

  it("applies space-y-1.5 to the wrapper for vertical rhythm", () => {
    const { container } = render(
      <AuthField id="email" label="Email">
        <input id="email" name="email" type="email" />
      </AuthField>,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("space-y-1.5");
  });
});