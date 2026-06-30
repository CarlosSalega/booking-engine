/**
 * `CancellationsTab` — Client Component for the Cancellations settings tab.
 *
 * Renders the "Cancelaciones" form inside the settings page. The form
 * edits the cancellation-rules section of the `OrganizationSettings`
 * row:
 *
 *  - `cancellationEnabled`    — boolean (Switch / toggle).
 *  - `cancellationLimitHours` — number, range 0–168. Disabled when the
 *                               toggle is off (per spec: "Toggle
 *                               disables hours field"). The value
 *                               stays in form state and is included in
 *                               the submit payload either way, so
 *                               turning the toggle back on keeps the
 *                               last value.
 *
 * Flow (mirrors `BusinessTab` / `BookingsTab` — same
 * `useTransition + useState` pattern as the rest of the project):
 *
 *   1. Local `cancellationEnabled` (boolean) and `cancellationLimitHours`
 *      (string for form binding) state pre-filled from the `settings`
 *      prop (or from `SETTINGS_DEFAULTS` when the row is `null`).
 *   2. Submit → `updateCancellationsSchema.safeParse(...)` for
 *      client-side validation. On parse failure → render inline
 *      per-field errors + a Spanish banner; the Server Action is
 *      NOT called.
 *   3. On parse success → call `updateCancellations` Server Action
 *      inside `startTransition(async () => ...)`.
 *   4. On action success → `toast.success("Configuración guardada")`
 *      + `router.refresh()` (the action invalidates the `settings`
 *      cache server-side).
 *   5. On action error → render the action's user-facing Spanish
 *      message inline; toast a copy.
 *
 * RBAC: the `readOnly` prop (resolved upstream by `SettingsGuard`)
 * disables the Switch, the hours input, AND the submit button.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Cancellations Tab
 *     - Scenario: Toggle disables hours field
 *     - Scenario: Toggle enables hours field
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertCircle, Loader2 } from "lucide-react";

import {
  updateCancellations,
  updateCancellationsSchema,
  type UpdateCancellationsInput,
} from "@/modules/settings/actions";
import type { OrganizationSettings } from "@/modules/settings/data/settings-data.types";
import { SETTINGS_DEFAULTS } from "@/modules/settings/domain/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

// ---------------------------------------------------------------------------
// Field ids — shared between the JSX, the error mapping, and the
// tests' `data-testid` selectors. Centralizing them prevents the
// "id vs error testid" drift bug.
// ---------------------------------------------------------------------------

const FIELD_IDS = {
  cancellationEnabled: "cancellations-tab-cancellationEnabled",
  cancellationLimitHours: "cancellations-tab-cancellationLimitHours",
} as const;

type FieldKey = keyof typeof FIELD_IDS;

// ---------------------------------------------------------------------------
// Form state shape — boolean for the toggle, string for the hours
// input (so we can clear with `user.clear()`). `buildPayload` converts
// to the action's typed shape.
// ---------------------------------------------------------------------------

interface FormState {
  cancellationEnabled: boolean;
  cancellationLimitHours: string;
}

type FieldErrors = Partial<Record<FieldKey, string>>;

/** Build the initial form state from the cached settings row (or `null`). */
function buildInitialState(
  settings: OrganizationSettings | null,
): FormState {
  if (!settings) {
    return {
      cancellationEnabled: SETTINGS_DEFAULTS.cancellationEnabled,
      cancellationLimitHours: String(SETTINGS_DEFAULTS.cancellationLimitHours),
    };
  }
  return {
    cancellationEnabled: settings.cancellationEnabled,
    cancellationLimitHours: String(settings.cancellationLimitHours),
  };
}

/**
 * Build the action payload. The hours field is a string in form state;
 * the action expects a number. Empty / non-numeric values are coerced
 * to `undefined` so the action's `.optional()` rule can take over
 * (defense-in-depth: the action's schema still validates the range).
 */
function buildPayload(values: FormState): Partial<UpdateCancellationsInput> {
  const trimmedHours = values.cancellationLimitHours.trim();
  let hours: number | undefined;
  if (trimmedHours !== "") {
    const n = Number(trimmedHours);
    if (Number.isFinite(n)) hours = n;
  }
  return {
    cancellationEnabled: values.cancellationEnabled,
    cancellationLimitHours: hours,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface CancellationsTabProps {
  /** Cached settings row, or `null` when no row exists yet. */
  settings: OrganizationSettings | null;
  /** RBAC: when `true`, all controls + submit are disabled. */
  readOnly: boolean;
}

export function CancellationsTab({ settings, readOnly }: CancellationsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<FormState>(() =>
    buildInitialState(settings),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // The hours field is disabled when the toggle is OFF (per spec) OR
  // when the user is read-only (RBAC for SECRETARY).
  const hoursDisabled = isPending || readOnly || !values.cancellationEnabled;

  function handleToggle(checked: boolean) {
    setValues((prev) => ({ ...prev, cancellationEnabled: checked }));
    setFieldErrors((prev) => {
      if (!prev.cancellationLimitHours) return prev;
      const next = { ...prev };
      delete next.cancellationLimitHours;
      return next;
    });
    setFormError(null);
  }

  function handleHoursChange(value: string) {
    setValues((prev) => ({ ...prev, cancellationLimitHours: value }));
    setFieldErrors((prev) => {
      if (!prev.cancellationLimitHours) return prev;
      const next = { ...prev };
      delete next.cancellationLimitHours;
      return next;
    });
    setFormError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = buildPayload(values);
    const parsed = updateCancellationsSchema.safeParse(payload);
    if (!parsed.success) {
      const newFieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const rawPath = issue.path[0];
        if (typeof rawPath === "string") {
          const key = rawPath as FieldKey;
          if (!newFieldErrors[key]) {
            newFieldErrors[key] = issue.message;
          }
        }
      }
      setFieldErrors(newFieldErrors);
      setFormError("Revisá los campos marcados.");
      return;
    }

    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      try {
        const result = await updateCancellations(parsed.data);
        if (result.success) {
          toast.success("Configuración guardada");
          router.refresh();
        } else {
          setFormError(result.error);
          toast.error(result.error);
        }
      } catch {
        const fallback = "No se pudo guardar la configuración. Intentá de nuevo.";
        setFormError(fallback);
        toast.error(fallback);
      }
    });
  }

  const isDisabled = isPending || readOnly;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      data-testid="cancellations-tab-form"
      className="space-y-4"
    >
      {formError ? (
        <div
          role="alert"
          data-testid="cancellations-tab-form-error"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 text-destructive" />
          <p className="text-destructive">{formError}</p>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <label
              htmlFor={FIELD_IDS.cancellationEnabled}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Habilitar cancelaciones
            </label>
            <p className="text-xs text-muted-foreground">
              Permitir que los pacientes cancelen sus turnos desde la
              plataforma.
            </p>
          </div>
          <Switch
            id={FIELD_IDS.cancellationEnabled}
            checked={values.cancellationEnabled}
            onCheckedChange={handleToggle}
            disabled={isDisabled}
            data-testid="cancellations-tab-toggle"
            aria-label="Habilitar cancelaciones"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={FIELD_IDS.cancellationLimitHours}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Límite de cancelación (horas)
        </label>
        <Input
          id={FIELD_IDS.cancellationLimitHours}
          type="number"
          min={0}
          max={168}
          value={values.cancellationLimitHours}
          onChange={(e) => handleHoursChange(e.target.value)}
          placeholder="24"
          disabled={hoursDisabled}
          aria-invalid={Boolean(fieldErrors.cancellationLimitHours)}
          data-testid="cancellations-tab-hours-input"
        />
        {fieldErrors.cancellationLimitHours ? (
          <p
            role="alert"
            data-testid={`field-error-${FIELD_IDS.cancellationLimitHours}`}
            className="text-xs text-destructive"
          >
            {fieldErrors.cancellationLimitHours}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Entre 0 y 168 horas (7 días). Horas m&iacute;nimas de
            anticipaci&oacute;n para cancelar; los turnos con menos
            anticipaci&oacute;n no podr&aacute;n cancelarse.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isDisabled}
          data-testid="cancellations-tab-submit"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>
    </form>
  );
}
