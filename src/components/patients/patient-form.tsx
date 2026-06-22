/**
 * `PatientForm` — Client Component for the edit patient page.
 *
 * Renders a form pre-filled with the patient's current data. On
 * submit:
 *   1. Client-side validation via Zod 4 (Spanish errors)
 *   2. If valid → call `updatePatient` Server Action
 *   3. On success → toast + redirect to the detail page
 *   4. On error → display the action's Spanish error inline
 *
 * The form is intentionally simple — no react-hook-form, no
 * `@hookform/resolvers`. The Zod schema is the single source of
 * truth for what the action accepts (`updatePatientSchema` from
 * `patient-actions.schema.ts`) and we re-use it on the client to
 * keep the rules identical.
 *
 * Why not `useActionState` (React 19): the existing `updatePatient`
 * Server Action returns a `PatientResult<void>` (a discriminated
 * union) rather than a `useActionState`-shaped `(prevState, formData)
 * => Promise<state>`. To keep the action signature stable, this
 * form uses a manual `useTransition` + local `useState` for the
 * error message. Functionally equivalent for our UX.
 *
 * RBAC: the dashboard layout redirects PATIENT users. The
 * Server Action also re-checks the role — defense in depth.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { AlertCircle, Loader2 } from "lucide-react";

import type { EnrichedPatient } from "@/modules/patients/data/patient-data.types";
import { updatePatient } from "@/modules/patients/actions";
import { updatePatientSchema } from "@/modules/patients/actions/patient-actions.schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PatientFormProps {
  patient: EnrichedPatient;
}

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  documentId: string;
  notes: string;
}

export function PatientForm({ patient }: PatientFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [values, setValues] = useState<FormState>({
    fullName: patient.fullName,
    email: patient.email ?? "",
    phone: patient.phone ?? "",
    documentId: patient.documentId ?? "",
    notes: patient.notes ?? "",
  });

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear the field error as the user types — but only for the field
    // they edited.
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFormError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Build the payload — convert empty strings to undefined for
    // optional fields so Zod's `.optional()` accepts them.
    const payload = {
      id: patient.id,
      fullName: values.fullName.trim(),
      email: values.email.trim() === "" ? undefined : values.email.trim(),
      phone: values.phone.trim() === "" ? undefined : values.phone.trim(),
      documentId:
        values.documentId.trim() === "" ? undefined : values.documentId.trim(),
      notes: values.notes === "" ? undefined : values.notes,
    };

      // Client-side Zod validation
    const parsed = updatePatientSchema.safeParse(payload);
    if (!parsed.success) {
      const newFieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string") {
          // Map schema fields back to form fields. `id` is not on the form.
          if (path === "id") continue;
          newFieldErrors[path as keyof FormState] = issue.message;
        }
      }
      setFieldErrors(newFieldErrors);
      // Generic top-level summary so the user knows the form is invalid.
      // The specific per-field message is rendered below the input.
      setFormError("Revisá los campos marcados.");
      return;
    }

    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      try {
        const result = await updatePatient(parsed.data);
        if (result.success) {
          toast.success("Paciente actualizado");
          router.push(`/dashboard/patients/${patient.id}`);
        } else {
          setFormError(result.error);
          toast.error(result.error);
        }
      } catch {
        setFormError("No se pudo actualizar el paciente. Intentá de nuevo.");
        toast.error("No se pudo actualizar el paciente. Intentá de nuevo.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-testid="patient-form"
      noValidate
    >
      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
          data-testid="patient-form-error"
        >
          <AlertCircle className="mt-0.5 size-4 text-destructive" />
          <p className="text-destructive">{formError}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          id="patient-form-fullName"
          label="Nombre completo"
          required
          error={fieldErrors.fullName}
        >
          <Input
            id="patient-form-fullName"
            value={values.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.fullName)}
            disabled={isPending}
          />
        </Field>

        <Field
          id="patient-form-email"
          label="Email"
          error={fieldErrors.email}
        >
          <Input
            id="patient-form-email"
            type="email"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            disabled={isPending}
          />
        </Field>

        <Field
          id="patient-form-phone"
          label="Teléfono"
          error={fieldErrors.phone}
        >
          <Input
            id="patient-form-phone"
            type="tel"
            value={values.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            aria-invalid={Boolean(fieldErrors.phone)}
            disabled={isPending}
          />
        </Field>

        <Field
          id="patient-form-documentId"
          label="DNI"
          error={fieldErrors.documentId}
          hint="7-8 dígitos sin puntos ni guiones"
        >
          <Input
            id="patient-form-documentId"
            value={values.documentId}
            onChange={(e) => handleChange("documentId", e.target.value)}
            aria-invalid={Boolean(fieldErrors.documentId)}
            placeholder="Sin puntos ni guiones"
            disabled={isPending}
          />
        </Field>

        <div className="md:col-span-2">
          <Field
            id="patient-form-notes"
            label="Notas"
            error={fieldErrors.notes}
            hint="Máximo 1000 caracteres"
          >
            <textarea
              id="patient-form-notes"
              value={values.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              aria-invalid={Boolean(fieldErrors.notes)}
              maxLength={1000}
              disabled={isPending}
              rows={4}
              className="flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30"
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
        <Button
          asChild
          type="button"
          variant="ghost"
          disabled={isPending}
        >
          <Link href={`/dashboard/patients/${patient.id}`}>Cancelar</Link>
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          data-testid="patient-form-submit"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar cambios"
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
          className="text-xs text-destructive"
          data-testid={`field-error-${id}`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
