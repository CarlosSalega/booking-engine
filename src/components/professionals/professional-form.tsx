/**
 * `ProfessionalForm` — Client Component for the create + edit professional
 * pages.
 *
 * Shared between `/dashboard/professionals/new` (create) and
 * `/dashboard/professionals/[id]/edit` (edit). The mode is controlled by
 * the `mode` prop; in edit mode the `professional` prop carries the
 * pre-fill values and the form is unlocked for updates.
 *
 * Flow: client-side Zod 4 validation → matching Server Action →
 * `router.replace()` to the detail page on success / inline Spanish
 * error banner on failure.
 *
 * Why not `useActionState` (React 19): the existing Server Actions
 * return a `ProfessionalResult<T>` (a discriminated union) rather than
 * a `useActionState`-shaped `(prevState, formData) => Promise<state>`.
 * To keep the action signature stable, this form uses a manual
 * `useTransition` + local `useState` for the error banner.
 *
 * Specialties are managed through the existing `TagInput` Client
 * Component. RBAC: the dashboard layout redirects PATIENT users; the
 * Server Actions re-check the role as defense in depth.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { AlertCircle, Loader2 } from "lucide-react";

import type { EnrichedProfessional } from "@/modules/professionals/data/professional-data.types";
import {
  ProfessionalStatus,
  type ProfessionalStatusType,
} from "@/modules/professionals/domain/professional";
import {
  createProfessional,
  updateProfessional,
  createProfessionalSchema,
  updateProfessionalSchema,
} from "@/modules/professionals/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { TagInput } from "./tag-input";

interface ProfessionalFormProps {
  mode: "create" | "edit";
  professional?: EnrichedProfessional;
}

interface FormState {
  fullName: string;
  email: string;
  specialties: string[];
  license: string;
  bio: string;
  status: ProfessionalStatusType;
}

const SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

const TEXTAREA_CLASS =
  "flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30";

function buildInitialState(
  mode: "create" | "edit",
  professional: EnrichedProfessional | undefined,
): FormState {
  if (mode === "edit" && professional) {
    return {
      fullName: professional.fullName,
      email: professional.email,
      specialties: [...professional.specialties],
      license: professional.license ?? "",
      bio: professional.bio ?? "",
      status: professional.status,
    };
  }
  return {
    fullName: "",
    email: "",
    specialties: [],
    license: "",
    bio: "",
    status: ProfessionalStatus.ACTIVE,
  };
}

function buildPayload(
  values: FormState,
  mode: "create" | "edit",
  professionalId: string,
) {
  const license = values.license.trim();
  const bio = values.bio.trim();
  return {
    ...(mode === "edit" ? { id: professionalId } : {}),
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    specialties: values.specialties,
    ...(license === "" ? {} : { license }),
    ...(bio === "" ? {} : { bio }),
    status: values.status,
  };
}

export function ProfessionalForm({ mode, professional }: ProfessionalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [values, setValues] = useState<FormState>(() =>
    buildInitialState(mode, professional),
  );

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
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
    const schema = mode === "create" ? createProfessionalSchema : updateProfessionalSchema;
    const payload = buildPayload(values, mode, professional?.id ?? "");
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const newFieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        // Map Zod path to form key. The action schemas use the
        // same field names as the form (`fullName`, `email`,
        // `specialties`, `license`, `bio`, `status`).
        const rawPath = issue.path[0];
        if (typeof rawPath === "string") {
          const key = rawPath as keyof FormState;
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
        const result =
          mode === "create"
            ? await createProfessional(parsed.data as Parameters<typeof createProfessional>[0])
            : await updateProfessional(parsed.data as Parameters<typeof updateProfessional>[0]);
        if (result.success) {
          toast.success(
            mode === "create" ? "Profesional creado" : "Profesional actualizado",
          );
          const targetId =
            mode === "create" && "data" in result && result.data
              ? result.data.id
              : professional?.id;
          if (targetId) router.replace(`/dashboard/professionals/${targetId}`);
        } else {
          setFormError(result.error);
          toast.error(result.error);
        }
      } catch {
        const fallback =
          mode === "create"
            ? "No se pudo crear el profesional. Intentá de nuevo."
            : "No se pudo actualizar el profesional. Intentá de nuevo.";
        setFormError(fallback);
        toast.error(fallback);
      }
    });
  }

  const cancelHref =
    mode === "create"
      ? "/dashboard/professionals"
      : `/dashboard/professionals/${professional?.id ?? ""}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-testid="professional-form"
      noValidate
    >
      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
          data-testid="professional-form-error"
        >
          <AlertCircle className="mt-0.5 size-4 text-destructive" />
          <p className="text-destructive">{formError}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          id="professional-form-fullName"
          label="Nombre completo"
          required
          error={fieldErrors.fullName}
        >
          <Input
            id="professional-form-fullName"
            value={values.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.fullName)}
            disabled={isPending}
          />
        </Field>

        <Field
          id="professional-form-email"
          label="Email"
          required
          error={fieldErrors.email}
          hint="Email de contacto del profesional"
        >
          <Input
            id="professional-form-email"
            type="email"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.email)}
            disabled={isPending}
          />
        </Field>

        <div className="md:col-span-2">
          <Field
            id="professional-form-specialties"
            label="Especialidades"
            required
            error={fieldErrors.specialties}
            hint="Escribí una y presioná Enter. Máximo 10."
          >
            <TagInput
              value={values.specialties}
              onChange={(next) => handleChange("specialties", next)}
              disabled={isPending}
              placeholder="Escribí una especialidad y presioná Enter…"
              ariaLabel="Agregar especialidad"
            />
          </Field>
        </div>

        <Field
          id="professional-form-license"
          label="Matrícula"
          error={fieldErrors.license}
          hint="Opcional. Hasta 50 caracteres."
        >
          <Input
            id="professional-form-license"
            value={values.license}
            onChange={(e) => handleChange("license", e.target.value)}
            aria-invalid={Boolean(fieldErrors.license)}
            disabled={isPending}
            maxLength={50}
          />
        </Field>

        <Field
          id="professional-form-status"
          label="Estado"
          required
          error={fieldErrors.status}
        >
          <select
            id="professional-form-status"
            value={values.status}
            onChange={(e) =>
              handleChange("status", e.target.value as ProfessionalStatusType)
            }
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.status)}
            disabled={isPending}
            className={SELECT_CLASS}
          >
            <option value={ProfessionalStatus.ACTIVE}>Activo</option>
            <option value={ProfessionalStatus.INACTIVE}>Inactivo</option>
          </select>
        </Field>

        <div className="md:col-span-2">
          <Field
            id="professional-form-bio"
            label="Bio"
            error={fieldErrors.bio}
            hint="Opcional. Hasta 1000 caracteres."
          >
            <textarea
              id="professional-form-bio"
              value={values.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              aria-invalid={Boolean(fieldErrors.bio)}
              maxLength={1000}
              disabled={isPending}
              rows={4}
              className={TEXTAREA_CLASS}
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
        <Button asChild type="button" variant="ghost" disabled={isPending}>
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={isPending} data-testid="professional-form-submit">
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
          className="text-xs text-destructive"
          data-testid={`field-error-${id}`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
