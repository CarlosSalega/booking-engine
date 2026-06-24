"use client";

/**
 * `WizardStepCustomer` — step 4 of the booking wizard.
 *
 * Two modes:
 * - **Existing patient** — search input + selectable list of patients
 *   fetched via the `getPatientsForWizard` Server Action. The search
 *   is debounced (300ms) to avoid hammering the server on every
 *   keystroke.
 * - **Guest** — three inputs (name, phone, email) and no DB lookup.
 *   The user types directly; the parent page wires the values into
 *   the wizard store.
 *
 * Toggling between modes is a `Tabs`-like radio group. The component
 * owns no state for the mode — the parent passes `mode` in and is
 * notified of changes via `onModeChange`.
 *
 * The patient search field is intentionally local to this component
 * (not in the store) because it's a transient UI input — the
 * selected patient is the only thing the store needs to track.
 */

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Mail, Phone, Search, User } from "lucide-react";

import { getPatientsForWizard } from "@/modules/bookings/actions";
import type { PatientOption } from "@/modules/bookings/data/booking-data.types";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type WizardCustomerMode = "existing" | "guest";

interface WizardStepCustomerProps {
  mode: WizardCustomerMode;
  onModeChange: (mode: WizardCustomerMode) => void;
  selectedPatientId: string | null;
  /** Called with the full patient object when the user picks one. */
  onSelectPatient: (patient: PatientOption) => void;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  onGuestChange: (name: string, phone: string, email: string) => void;
}

type FetchState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; patients: PatientOption[] };

const DEBOUNCE_MS = 300;

export function WizardStepCustomer({
  mode,
  onModeChange,
  selectedPatientId,
  onSelectPatient,
  guestName,
  guestPhone,
  guestEmail,
  onGuestChange,
}: WizardStepCustomerProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce: commit `search` to `debouncedSearch` 300ms after the
  // user stops typing. The fetch is keyed on the debounced value so
  // we only hit the server once per pause.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  // Fetch patients when debouncedSearch changes (and only in existing mode).
  // The synchronous setState to "loading" is the standard
  // data-fetching pattern in React 19; we suppress the lint rule
  // because the alternative (useTransition + Suspense) is overkill
  // for a 3-step Client Component flow.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (mode !== "existing") return;
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const patients = await getPatientsForWizard(debouncedSearch || undefined);
        if (!cancelled) setState({ kind: "ready", patients });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, debouncedSearch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="space-y-4" data-wizard-step-customer>
      {/* Mode toggle — a Tabs-style radio group */}
      <div
        role="tablist"
        aria-label="Tipo de cliente"
        className="inline-flex rounded-lg border bg-muted/30 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "existing"}
          onClick={() => onModeChange("existing")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "existing"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Paciente existente
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "guest"}
          onClick={() => onModeChange("guest")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "guest"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Invitado
        </button>
      </div>

      {mode === "existing" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="wizard-patient-search"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Search className="size-3.5" />
              Buscar paciente
            </label>
            <Input
              id="wizard-patient-search"
              type="search"
              placeholder="Nombre o email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          {state.kind === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Buscando pacientes…
            </div>
          ) : state.kind === "error" ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
            >
              <AlertCircle className="mt-0.5 size-4 text-destructive" />
              <p className="text-destructive">
                No se pudieron cargar los pacientes.
              </p>
            </div>
          ) : state.patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No se encontraron pacientes.
            </p>
          ) : (
            <ul role="list" className="grid grid-cols-1 gap-2">
              {state.patients.map((patient) => {
                const selected = patient.id === selectedPatientId;
                return (
                  <li key={patient.id}>
                    <button
                      type="button"
                      onClick={() => onSelectPatient(patient)}
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {patient.user.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {patient.user.email}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="wizard-guest-name"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <User className="size-3.5" />
              Nombre
            </label>
            <Input
              id="wizard-guest-name"
              value={guestName}
              onChange={(e) =>
                onGuestChange(e.target.value, guestPhone, guestEmail)
              }
              placeholder="Nombre del invitado"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="wizard-guest-phone"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Phone className="size-3.5" />
              Teléfono
            </label>
            <Input
              id="wizard-guest-phone"
              value={guestPhone}
              onChange={(e) =>
                onGuestChange(guestName, e.target.value, guestEmail)
              }
              placeholder="351-1234567"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="wizard-guest-email"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Mail className="size-3.5" />
              Email (opcional)
            </label>
            <Input
              id="wizard-guest-email"
              type="email"
              value={guestEmail}
              onChange={(e) =>
                onGuestChange(guestName, guestPhone, e.target.value)
              }
              placeholder="email@ejemplo.com"
            />
          </div>
        </div>
      )}
    </div>
  );
}
