/**
 * `ServiceForm` — Client Component for the create + edit service pages.
 *
 * Shared between `/dashboard/services/new` (create) and
 * `/dashboard/services/[id]/edit` (edit). The mode is controlled by
 * the `mode` prop; in edit mode the `service` prop carries the
 * pre-fill values and the form is unlocked for updates.
 *
 * Flow: client-side Zod 4 validation → matching Server Action →
 * `router.replace()` to the detail page on success / inline Spanish
 * error banner on failure.
 *
 * Why not `useActionState` (React 19): the existing Server Actions
 * return a `ServiceResult<T>` (a discriminated union) rather than a
 * `useActionState`-shaped `(prevState, formData) => Promise<state>`.
 * To keep the action signature stable, this form uses a manual
 * `useTransition` + local `useState` for the error banner.
 *
 * The `depositAmount` field is rendered conditionally on
 * `paymentType === "DEPOSIT"`. RBAC: the dashboard layout redirects
 * PATIENT users; the Server Actions re-check the role as defense in
 * depth.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { AlertCircle, Loader2 } from "lucide-react";

import type { EnrichedService } from "@/modules/services/data/service-data.types";
import {
  PaymentType,
  ServiceStatus,
  type PaymentTypeType,
} from "@/modules/services/domain/service";
import {
  createService,
  updateService,
  createServiceSchema,
  updateServiceSchema,
} from "@/modules/services/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ServiceFormProps {
  mode: "create" | "edit";
  professionals: ReadonlyArray<{ id: string; name: string }>;
  service?: EnrichedService;
}

interface FormState {
  name: string;
  description: string;
  professionalId: string;
  durationMinutes: string;
  price: string;
  paymentType: PaymentTypeType;
  depositAmount: string;
}

const SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

const TEXTAREA_CLASS =
  "flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30";

function buildInitialState(
  mode: "create" | "edit",
  service: EnrichedService | undefined,
  professionals: ReadonlyArray<{ id: string; name: string }>,
): FormState {
  if (mode === "edit" && service) {
    return {
      name: service.name,
      description: service.description ?? "",
      professionalId: service.professionalId,
      durationMinutes: String(service.durationMinutes),
      price: service.price ? service.price.amount.toString() : "",
      paymentType: service.paymentType,
      depositAmount: service.depositAmount?.amount?.toString() ?? "",
    };
  }
  return {
    name: "",
    description: "",
    professionalId: professionals[0]?.id ?? "",
    durationMinutes: "30",
    price: "",
    paymentType: PaymentType.NONE,
    depositAmount: "",
  };
}

function buildPayload(
  values: FormState,
  mode: "create" | "edit",
  serviceId: string,
) {
  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
  const money = (v: string) => {
    const n = num(v);
    return n === undefined ? undefined : { amount: n, currency: "ARS" as const };
  };
  const desc = values.description.trim();
  return {
    ...(mode === "edit" ? { id: serviceId } : {}),
    name: values.name.trim(),
    ...(desc === "" ? {} : { description: desc }),
    durationMinutes: Number(values.durationMinutes),
    ...(money(values.price) ? { price: money(values.price) } : {}),
    paymentType: values.paymentType,
    ...(money(values.depositAmount) ? { depositAmount: money(values.depositAmount) } : {}),
    professionalId: values.professionalId,
    ...(mode === "create" ? { status: ServiceStatus.ACTIVE } : {}),
  };
}

export function ServiceForm({ mode, professionals, service }: ServiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [values, setValues] = useState<FormState>(() =>
    buildInitialState(mode, service, professionals),
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
    const schema = mode === "create" ? createServiceSchema : updateServiceSchema;
    const payload = buildPayload(values, mode, service?.id ?? "");
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const newFieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string") {
          newFieldErrors[path as keyof FormState] = issue.message;
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
            ? await createService(parsed.data as Parameters<typeof createService>[0])
            : await updateService(parsed.data as Parameters<typeof updateService>[0]);
        if (result.success) {
          toast.success(
            mode === "create" ? "Servicio creado" : "Servicio actualizado",
          );
          const targetId =
            mode === "create" && "data" in result && result.data
              ? result.data.id
              : service?.id;
          if (targetId) router.replace(`/dashboard/services/${targetId}`);
        } else {
          setFormError(result.error);
          toast.error(result.error);
        }
      } catch {
        const fallback =
          mode === "create"
            ? "No se pudo crear el servicio. Intentá de nuevo."
            : "No se pudo actualizar el servicio. Intentá de nuevo.";
        setFormError(fallback);
        toast.error(fallback);
      }
    });
  }

  const showDeposit = values.paymentType === PaymentType.DEPOSIT;
  const cancelHref =
    mode === "create"
      ? "/dashboard/services/new"
      : `/dashboard/services/${service?.id ?? ""}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-testid="service-form"
      noValidate
    >
      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
          data-testid="service-form-error"
        >
          <AlertCircle className="mt-0.5 size-4 text-destructive" />
          <p className="text-destructive">{formError}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="service-form-name" label="Nombre" required error={fieldErrors.name}>
          <Input
            id="service-form-name"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.name)}
            disabled={isPending}
          />
        </Field>

        <Field
          id="service-form-professionalId"
          label="Profesional"
          required
          error={fieldErrors.professionalId}
        >
          <select
            id="service-form-professionalId"
            value={values.professionalId}
            onChange={(e) => handleChange("professionalId", e.target.value)}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.professionalId)}
            disabled={isPending}
            className={SELECT_CLASS}
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="md:col-span-2">
          <Field
            id="service-form-description"
            label="Descripción"
            error={fieldErrors.description}
            hint="Máximo 500 caracteres"
          >
            <textarea
              id="service-form-description"
              value={values.description}
              onChange={(e) => handleChange("description", e.target.value)}
              aria-invalid={Boolean(fieldErrors.description)}
              maxLength={500}
              disabled={isPending}
              rows={3}
              className={TEXTAREA_CLASS}
            />
          </Field>
        </div>

        <Field
          id="service-form-durationMinutes"
          label="Duración (minutos)"
          required
          error={fieldErrors.durationMinutes}
        >
          <Input
            id="service-form-durationMinutes"
            type="number"
            min={5}
            step={1}
            value={values.durationMinutes}
            onChange={(e) => handleChange("durationMinutes", e.target.value)}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.durationMinutes)}
            disabled={isPending}
          />
        </Field>

        <Field
          id="service-form-price"
          label="Precio"
          error={fieldErrors.price}
          hint="Opcional. Hasta 2 decimales."
        >
          <Input
            id="service-form-price"
            type="number"
            min={0}
            step={0.01}
            value={values.price}
            onChange={(e) => handleChange("price", e.target.value)}
            aria-invalid={Boolean(fieldErrors.price)}
            disabled={isPending}
          />
        </Field>

        <Field
          id="service-form-paymentType"
          label="Tipo de pago"
          required
          error={fieldErrors.paymentType}
        >
          <select
            id="service-form-paymentType"
            value={values.paymentType}
            onChange={(e) =>
              handleChange("paymentType", e.target.value as PaymentTypeType)
            }
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.paymentType)}
            disabled={isPending}
            className={SELECT_CLASS}
          >
            <option value={PaymentType.NONE}>Sin costo</option>
            <option value={PaymentType.DEPOSIT}>Seña</option>
            <option value={PaymentType.FULL}>Pago completo</option>
          </select>
        </Field>

        {showDeposit ? (
          <Field
            id="service-form-depositAmount"
            label="Seña"
            required
            error={fieldErrors.depositAmount}
            hint="Hasta 2 decimales. No puede ser mayor al precio."
          >
            <Input
              id="service-form-depositAmount"
              type="number"
              min={0}
              step={0.01}
              value={values.depositAmount}
              onChange={(e) => handleChange("depositAmount", e.target.value)}
              aria-required="true"
              aria-invalid={Boolean(fieldErrors.depositAmount)}
              disabled={isPending}
            />
          </Field>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
        <Button asChild type="button" variant="ghost" disabled={isPending}>
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={isPending} data-testid="service-form-submit">
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
