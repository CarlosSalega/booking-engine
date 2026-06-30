/**
 * `BookingsTab` — Client Component for the Bookings settings tab.
 *
 * Renders the "Reservas" form inside the settings page. The form edits
 * the booking-rules section of the `OrganizationSettings` row:
 *
 *  - `defaultDurationMinutes` — default slot length (5–480, step 5)
 *  - `minAdvanceBookingHours` — earliest lead time (0–168)
 *  - `maxBookingsPerDay`      — daily booking cap (1–200)
 *  - `bufferMinutes`          — inter-booking buffer (0–120)
 *
 * Flow (mirrors `BusinessTab` — same `useTransition + useState`
 * pattern as the rest of the project):
 *
 *   1. Local `values` state pre-filled from the `settings` prop (or
 *      from `SETTINGS_DEFAULTS` when the row is `null`).
 *   2. Submit → `updateBookingsSchema.safeParse(...)` for client-side
 *      validation. On parse failure → render inline per-field errors
 *      + a Spanish banner; the Server Action is NOT called.
 *   3. On parse success → call the `updateBookings` Server Action
 *      inside `startTransition(async () => ...)`.
 *   4. On action success → `toast.success("Configuración guardada")`
 *      + `router.refresh()` (the action already called
 *      `updateTag("settings")` server-side).
 *   5. On action error → render the action's user-facing Spanish
 *      message inline; toast a copy.
 *
 * RBAC: the `readOnly` prop (resolved upstream by `SettingsGuard`)
 * disables every input AND the submit button.
 *
 * Each field has a helper text describing its valid range. The
 * helper text is shown below the field when no error is present,
 * giving the user immediate guidance on acceptable values.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Bookings Tab → Scenario: Bookings range guard
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertCircle, Loader2 } from "lucide-react";

import {
  updateBookings,
  updateBookingsSchema,
  type UpdateBookingsInput,
} from "@/modules/settings/actions";
import type { OrganizationSettings } from "@/modules/settings/data/settings-data.types";
import { SETTINGS_DEFAULTS } from "@/modules/settings/domain/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Field ids — shared between the JSX, the error mapping, and the
// tests' `data-testid` selectors.
// ---------------------------------------------------------------------------

const FIELD_IDS = {
  defaultDurationMinutes: "bookings-tab-defaultDurationMinutes",
  minAdvanceBookingHours: "bookings-tab-minAdvanceBookingHours",
  maxBookingsPerDay: "bookings-tab-maxBookingsPerDay",
  bufferMinutes: "bookings-tab-bufferMinutes",
} as const;

type FieldKey = keyof typeof FIELD_IDS;

// ---------------------------------------------------------------------------
// Range metadata — used for the `min` / `max` HTML attributes on the
// <input type="number">, the helper text, and the Zod schema
// (mirrored — the schema is the source of truth, this is for UX).
// ---------------------------------------------------------------------------

const RANGE: Record<FieldKey, { min: number; max: number; step?: number }> = {
  defaultDurationMinutes: { min: 5, max: 480, step: 5 },
  minAdvanceBookingHours: { min: 0, max: 168 },
  maxBookingsPerDay: { min: 1, max: 200 },
  bufferMinutes: { min: 0, max: 120 },
};

// ---------------------------------------------------------------------------
// Form state shape — strings for form binding, then converted to
// numbers in `buildPayload`.
// ---------------------------------------------------------------------------

interface FormState {
  defaultDurationMinutes: string;
  minAdvanceBookingHours: string;
  maxBookingsPerDay: string;
  bufferMinutes: string;
}

type FieldErrors = Partial<Record<FieldKey, string>>;

/** Build the initial form state from the cached settings row (or `null`). */
function buildInitialState(
  settings: OrganizationSettings | null,
): FormState {
  if (!settings) {
    return {
      defaultDurationMinutes: String(SETTINGS_DEFAULTS.defaultDurationMinutes),
      minAdvanceBookingHours: String(SETTINGS_DEFAULTS.minAdvanceBookingHours),
      maxBookingsPerDay: String(SETTINGS_DEFAULTS.maxBookingsPerDay),
      bufferMinutes: String(SETTINGS_DEFAULTS.bufferMinutes),
    };
  }
  return {
    defaultDurationMinutes: String(settings.defaultDurationMinutes),
    minAdvanceBookingHours: String(settings.minAdvanceBookingHours),
    maxBookingsPerDay: String(settings.maxBookingsPerDay),
    bufferMinutes: String(settings.bufferMinutes),
  };
}

/**
 * Build the action payload. The form values are strings (form
 * binding); the action expects numbers. Empty / non-numeric values
 * are coerced to `undefined` so the action's `.optional()` rules
 * can take over.
 */
function buildPayload(values: FormState): Partial<UpdateBookingsInput> {
  const toNum = (v: string): number | undefined => {
    if (v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    defaultDurationMinutes: toNum(values.defaultDurationMinutes),
    minAdvanceBookingHours: toNum(values.minAdvanceBookingHours),
    maxBookingsPerDay: toNum(values.maxBookingsPerDay),
    bufferMinutes: toNum(values.bufferMinutes),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface BookingsTabProps {
  /** Cached settings row, or `null` when no row exists yet. */
  settings: OrganizationSettings | null;
  /** RBAC: when `true`, all fields + submit are disabled. */
  readOnly: boolean;
}

export function BookingsTab({ settings, readOnly }: BookingsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<FormState>(() =>
    buildInitialState(settings),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear the field-level error + general banner once the user
    // re-edits the offending field.
    setFieldErrors((prev) => {
      if (!prev[key as FieldKey]) return prev;
      const next = { ...prev };
      delete next[key as FieldKey];
      return next;
    });
    setFormError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = buildPayload(values);
    const parsed = updateBookingsSchema.safeParse(payload);
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
        const result = await updateBookings(parsed.data);
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
      data-testid="bookings-tab-form"
      className="space-y-4"
    >
      {formError ? (
        <div
          role="alert"
          data-testid="bookings-tab-form-error"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 text-destructive" />
          <p className="text-destructive">{formError}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberField
          id={FIELD_IDS.defaultDurationMinutes}
          label="Duración predeterminada (minutos)"
          required
          min={RANGE.defaultDurationMinutes.min}
          max={RANGE.defaultDurationMinutes.max}
          step={RANGE.defaultDurationMinutes.step}
          helperText="Entre 5 y 480 minutos. Usado como duración por defecto al crear turnos."
          value={values.defaultDurationMinutes}
          onChange={(v) => handleChange("defaultDurationMinutes", v)}
          disabled={isDisabled}
          error={fieldErrors.defaultDurationMinutes}
        />

        <NumberField
          id={FIELD_IDS.minAdvanceBookingHours}
          label="Anticipación mínima (horas)"
          required
          min={RANGE.minAdvanceBookingHours.min}
          max={RANGE.minAdvanceBookingHours.max}
          helperText="Entre 0 y 168 horas (7 días). Los pacientes no podrán reservar con menos anticipación."
          value={values.minAdvanceBookingHours}
          onChange={(v) => handleChange("minAdvanceBookingHours", v)}
          disabled={isDisabled}
          error={fieldErrors.minAdvanceBookingHours}
        />

        <NumberField
          id={FIELD_IDS.maxBookingsPerDay}
          label="Máximo de reservas por día"
          required
          min={RANGE.maxBookingsPerDay.min}
          max={RANGE.maxBookingsPerDay.max}
          helperText="Entre 1 y 200. Tope diario de turnos que se pueden agendar."
          value={values.maxBookingsPerDay}
          onChange={(v) => handleChange("maxBookingsPerDay", v)}
          disabled={isDisabled}
          error={fieldErrors.maxBookingsPerDay}
        />

        <NumberField
          id={FIELD_IDS.bufferMinutes}
          label="Buffer entre turnos (minutos)"
          required
          min={RANGE.bufferMinutes.min}
          max={RANGE.bufferMinutes.max}
          helperText="Entre 0 y 120 minutos. Tiempo de descanso entre un turno y el siguiente."
          value={values.bufferMinutes}
          onChange={(v) => handleChange("bufferMinutes", v)}
          disabled={isDisabled}
          error={fieldErrors.bufferMinutes}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isDisabled}
          data-testid="bookings-tab-submit"
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

// ---------------------------------------------------------------------------
// NumberField — label + number input + inline error / helper text.
// ---------------------------------------------------------------------------

interface NumberFieldProps {
  id: string;
  label: string;
  required?: boolean;
  min: number;
  max: number;
  step?: number;
  helperText: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

function NumberField({
  id,
  label,
  required,
  min,
  max,
  step,
  helperText,
  value,
  onChange,
  disabled,
  error,
}: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-required={required}
        aria-invalid={Boolean(error)}
      />
      {error ? (
        <p
          role="alert"
          data-testid={`field-error-${id}`}
          className="text-xs text-destructive"
        >
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
