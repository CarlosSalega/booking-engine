/**
 * `BusinessTab` — Client Component for the Business settings tab.
 *
 * Renders the "Negocio" form inside the settings page. The form edits
 * the business-identity section of the `OrganizationSettings` row:
 * name, description, address, timezone, phone, email.
 *
 * Flow (mirrors the project-wide `useTransition + useState` pattern
 * used by `ServiceForm` and `ProfessionalForm`):
 *
 *   1. Local `values` state pre-filled from the `settings` prop (or
 *      from `SETTINGS_DEFAULTS` when the row is `null` — greenfield).
 *   2. Submit → `updateBusinessSchema.safeParse(...)` for client-side
 *      validation. On parse failure → render inline per-field errors
 *      + a Spanish banner; the Server Action is NOT called.
 *   3. On parse success → `startTransition(async () => {...})` to
 *      call the `updateBusiness` Server Action.
 *   4. On action success → `toast.success("Configuración guardada")`
 *      + `router.refresh()` so the cached `getSettings(orgId)` re-reads
 *      (the action already called `updateTag("settings")` server-side).
 *   5. On action error → render the action's user-facing Spanish
 *      message inline; toast a copy.
 *
 * RBAC: the `readOnly` prop (resolved upstream by `SettingsGuard`)
 * disables every input AND the submit button. SECRETARY sees the
 * banner; ADMIN sees an editable form.
 *
 * The Server Action is imported from
 * `@/modules/settings/actions` (which re-exports the implementation
 * from `./update-settings.action`). The schema import comes from the
 * action barrel too so the Spanish error messages match the
 * server-side validation (defense-in-depth: client validation is a
 * UX accelerator, the server still validates).
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Tabbed Settings Page → Scenario: Settings load from cache
 *   - Requirement: Form Behavior
 *     - Scenario: Successful save
 *     - Scenario: Validation error
 *     - Scenario: Server error
 *   - Requirement: Business Tab → Scenario: Timezone selection
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertCircle, Loader2 } from "lucide-react";

import {
  updateBusiness,
  updateBusinessSchema,
  type UpdateBusinessInput,
} from "@/modules/settings/actions";
import type { OrganizationSettings } from "@/modules/settings/data/settings-data.types";
import { SETTINGS_DEFAULTS } from "@/modules/settings/domain/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimezoneSelect } from "../timezone-select";

// ---------------------------------------------------------------------------
// Field ids — shared between the JSX, the error mapping, and the
// tests' `data-testid` selectors. Centralizing them prevents the
// "id vs error testid" drift bug.
// ---------------------------------------------------------------------------

const FIELD_IDS = {
  name: "business-tab-name",
  description: "business-tab-description",
  address: "business-tab-address",
  timezone: "business-tab-timezone",
  phone: "business-tab-phone",
  email: "business-tab-email",
} as const;

type FieldKey = keyof typeof FIELD_IDS;

// ---------------------------------------------------------------------------
// Styles — match the project's shared `data-slot="input"` tokens.
// ---------------------------------------------------------------------------

const TEXTAREA_CLASS =
  "flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30";

// ---------------------------------------------------------------------------
// Form state shape — strings for form binding (so we can clear with
// `user.clear`), then converted to the action's typed payload in
// `buildPayload`.
// ---------------------------------------------------------------------------

interface FormState {
  name: string;
  description: string;
  address: string;
  timezone: string;
  phone: string;
  email: string;
}

type FieldErrors = Partial<Record<FieldKey, string>>;

/** Build the initial form state from the cached settings row (or `null`). */
function buildInitialState(
  settings: OrganizationSettings | null,
): FormState {
  if (!settings) {
    return {
      name: SETTINGS_DEFAULTS.name,
      description: SETTINGS_DEFAULTS.description ?? "",
      address: SETTINGS_DEFAULTS.address ?? "",
      timezone: SETTINGS_DEFAULTS.timezone,
      phone: SETTINGS_DEFAULTS.phone ?? "",
      email: SETTINGS_DEFAULTS.email ?? "",
    };
  }
  return {
    name: settings.name,
    description: settings.description ?? "",
    address: settings.address ?? "",
    timezone: settings.timezone,
    phone: settings.phone ?? "",
    email: settings.email ?? "",
  };
}

/**
 * Build the action payload. Empty strings for optional fields are
 * dropped (the action's schema treats them as "clear the value").
 * `name` is trimmed but always sent.
 */
function buildPayload(values: FormState): Partial<UpdateBusinessInput> {
  const trimOrUndef = (v: string) => {
    const t = v.trim();
    return t === "" ? undefined : t;
  };
  return {
    name: values.name.trim(),
    description: trimOrUndef(values.description) ?? null,
    address: trimOrUndef(values.address) ?? null,
    timezone: values.timezone,
    phone: trimOrUndef(values.phone) ?? null,
    email: trimOrUndef(values.email) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface BusinessTabProps {
  /** Cached settings row, or `null` when no row exists yet. */
  settings: OrganizationSettings | null;
  /** RBAC: when `true`, all fields + submit are disabled. */
  readOnly: boolean;
}

export function BusinessTab({ settings, readOnly }: BusinessTabProps) {
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
    // re-edits the offending field. Mirrors the existing
    // `ServiceForm` UX.
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
    const parsed = updateBusinessSchema.safeParse(payload);
    if (!parsed.success) {
      const newFieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const rawPath = issue.path[0];
        if (typeof rawPath === "string") {
          const key = rawPath as FieldKey;
          // Take the first issue per field (the schema is `.strip()`,
          // and Zod reports all issues; the user only needs one
          // message per field for inline display).
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
        const result = await updateBusiness(parsed.data);
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
      data-testid="business-tab-form"
      className="space-y-4"
    >
      {formError ? (
        <div
          role="alert"
          data-testid="business-tab-form-error"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 text-destructive" />
          <p className="text-destructive">{formError}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          id={FIELD_IDS.name}
          label="Nombre"
          required
          error={fieldErrors.name}
        >
          <Input
            id={FIELD_IDS.name}
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Clínica, Consultorio, etc."
            disabled={isDisabled}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.name)}
          />
        </Field>

        <Field
          id={FIELD_IDS.timezone}
          label="Zona horaria"
          required
          error={fieldErrors.timezone}
          hint="Se usa para agendar turnos y enviar recordatorios."
        >
          <TimezoneSelect
            id={FIELD_IDS.timezone}
            value={values.timezone}
            onChange={(v) => handleChange("timezone", v)}
            disabled={isDisabled}
            aria-invalid={Boolean(fieldErrors.timezone)}
          />
        </Field>

        <div className="md:col-span-2">
          <Field
            id={FIELD_IDS.description}
            label="Descripción"
            error={fieldErrors.description}
            hint="Hasta 500 caracteres."
          >
            <textarea
              id={FIELD_IDS.description}
              value={values.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Una breve descripción de la organización."
              maxLength={500}
              rows={3}
              disabled={isDisabled}
              aria-invalid={Boolean(fieldErrors.description)}
              className={TEXTAREA_CLASS}
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field
            id={FIELD_IDS.address}
            label="Dirección"
            error={fieldErrors.address}
            hint="Hasta 200 caracteres."
          >
            <Input
              id={FIELD_IDS.address}
              value={values.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Av. Siempre Viva 742, CABA"
              disabled={isDisabled}
              aria-invalid={Boolean(fieldErrors.address)}
            />
          </Field>
        </div>

        <Field
          id={FIELD_IDS.phone}
          label="Teléfono"
          error={fieldErrors.phone}
          hint="Opcional. Formato internacional (ej. +5491144440000)."
        >
          <Input
            id={FIELD_IDS.phone}
            type="tel"
            value={values.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+5491144440000"
            disabled={isDisabled}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
        </Field>

        <Field
          id={FIELD_IDS.email}
          label="Email"
          error={fieldErrors.email}
          hint="Opcional. Visible para los pacientes."
        >
          <Input
            id={FIELD_IDS.email}
            type="email"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="contacto@clinica.test"
            disabled={isDisabled}
            aria-invalid={Boolean(fieldErrors.email)}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isDisabled}
          data-testid="business-tab-submit"
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
// Field — small label + input wrapper with inline error.
// ---------------------------------------------------------------------------

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ id, label, required, error, hint, children }: FieldProps) {
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
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p
          role="alert"
          data-testid={`field-error-${id}`}
          className="text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
