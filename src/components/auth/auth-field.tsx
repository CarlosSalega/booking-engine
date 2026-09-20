/**
 * `AuthField` — shared label + input + hint + error primitive for auth forms.
 *
 * Consumed by `LoginForm` (slice 1a) and `RegisterForm` (slice 1b). The
 * primitive fixes C1 structurally: an `AuthField` without an explicit
 * `errorId` cannot satisfy the auth spec's "stable, unique id and
 * `role=\"alert\"`" requirement, so the association cannot regress
 * silently.
 *
 * The input itself stays in the parent form (it needs an icon wrapper
 * and a password toggle), so the parent passes the matching
 * `aria-invalid` + `aria-describedby` values explicitly. Sizing
 * (`h-11 text-base md:text-sm`) is owned by the parent — the primitive
 * intentionally leaves the input className alone.
 *
 * Sizing convention (from design, shared with login-form.tsx):
 *   Inputs: `h-11 text-base md:text-sm` — 44px touch target + iOS-safe
 *           16px on mobile (prevents auto-zoom), 14px on ≥md.
 *
 * Contract (slice 1a):
 *   - Renders a `<label htmlFor={id}>` containing the label text (and a
 *     `*` indicator when `required`).
 *   - Renders `children` after the label.
 *   - When `error` is set AND `errorId` is set, renders one
 *     `<p id={errorId} role="alert" className="text-xs text-destructive">`.
 *   - When `hint` is set AND `error` is NOT set, renders
 *     `<p id={hintId} className="text-xs text-muted-foreground">`.
 *   - The hint is hidden whenever an error is present.
 */

import * as React from "react";

export interface AuthFieldProps {
  /** Input id; used as the label's `htmlFor`. */
  id: string;
  /** Visible label text. */
  label: string;
  /** When true, renders a red `*` next to the label. */
  required?: boolean;
  /** Error message; controls whether the error node is shown. */
  error?: string | null;
  /** Stable id for the error `<p>`. Required when `error` is set. */
  errorId?: string;
  /** Helper text shown below the input when no error is present. */
  hint?: string | null;
  /** Stable id for the hint `<p>`. Required when `hint` is set. */
  hintId?: string;
  /** The actual `<input>` (or wrapped input), wired by the parent. */
  children: React.ReactNode;
}

export function AuthField({
  id,
  label,
  required,
  error,
  errorId,
  hint,
  hintId,
  children,
}: AuthFieldProps) {
  const hasError = Boolean(error);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      {children}
      {hint && !hasError ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {hasError ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}