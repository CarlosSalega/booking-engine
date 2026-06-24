"use client";

/**
 * `/dashboard/bookings/new` — the booking creation wizard.
 *
 * Client Component orchestrator for the 6-step wizard:
 *   1. Servicio
 *   2. Profesional
 *   3. Horario
 *   4. Cliente
 *   5. Pago
 *   6. Confirmar
 *
 * The page is intentionally thin: it owns the wizard store, mounts
 * the right step component for `currentStep`, and wires the
 * navigation buttons. All step-specific logic lives in the step
 * components; all server-side validation lives in `createBooking`.
 *
 * Mount cleanup: `useEffect(() => reset(), [])` clears stale state
 * so revisiting the page always starts clean. The store is local to
 * this page (no `persist` middleware).
 *
 * Submit flow (step 6):
 * - Build the `createBooking` payload from the store. The wizard
 *   uses string-based `date` + `startTime`/`endTime`; the action
 *   expects a `Date` for `startTime` (and computes `endTime` from
 *   the service duration). We synthesize a `Date` from the date +
 *   start time.
 * - For guest checkout, we pass `patientId: undefined` and the
 *   `guestName` / `guestPhone` / `guestEmail` fields. The action
 *   stores the guest info in the `notes` column (per the design's
 *   AD7).
 * - On success, redirect to the new booking's detail page.
 * - On error, surface the user-facing Spanish message in the
 *   confirm step's error alert.
 *
 * UX:
 * - The progress bar is always visible at the top.
 * - The current step renders below the progress bar.
 * - The navigation bar (Anterior / Siguiente or Crear reserva /
 *   Cancelar) is at the bottom.
 * - "Cancelar" is always available — it resets the store and goes
 *   back to the list page.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createBooking } from "@/modules/bookings/actions";
import type { BookingResult } from "@/modules/bookings/actions";
import {
  canAdvanceFromStep,
  useWizardStore,
} from "@/modules/bookings/presentation/wizard-store";

import { Button } from "@/components/ui/button";

import { WizardProgress } from "@/components/bookings/wizard/wizard-progress";
import { WizardNavigation } from "@/components/bookings/wizard/wizard-navigation";
import { WizardStepService } from "@/components/bookings/wizard/wizard-step-service";
import { WizardStepProfessional } from "@/components/bookings/wizard/wizard-step-professional";
import { WizardStepSchedule } from "@/components/bookings/wizard/wizard-step-schedule";
import { WizardStepCustomer } from "@/components/bookings/wizard/wizard-step-customer";
import { WizardStepPayment } from "@/components/bookings/wizard/wizard-step-payment";
import { WizardStepConfirm } from "@/components/bookings/wizard/wizard-step-confirm";

export default function NewBookingPage() {
  const router = useRouter();

  // ---------------------------------------------------------------------
  // Store selectors — keep subscriptions narrow so the page doesn't
  // re-render on every field change. Each step component subscribes to
  // its own slice.
  // ---------------------------------------------------------------------
  const currentStep = useWizardStore((s) => s.currentStep);
  const serviceId = useWizardStore((s) => s.serviceId);
  const selectedService = useWizardStore((s) => s.selectedService);
  const professionalId = useWizardStore((s) => s.professionalId);
  const selectedProfessional = useWizardStore((s) => s.selectedProfessional);
  const date = useWizardStore((s) => s.date);
  const startTime = useWizardStore((s) => s.startTime);
  const endTime = useWizardStore((s) => s.endTime);
  const patientId = useWizardStore((s) => s.patientId);
  const selectedPatient = useWizardStore((s) => s.selectedPatient);
  const isGuest = useWizardStore((s) => s.isGuest);
  const guestName = useWizardStore((s) => s.guestName);
  const guestPhone = useWizardStore((s) => s.guestPhone);
  const guestEmail = useWizardStore((s) => s.guestEmail);
  const notes = useWizardStore((s) => s.notes);
  const isSubmitting = useWizardStore((s) => s.isSubmitting);
  const error = useWizardStore((s) => s.error);

  const setService = useWizardStore((s) => s.setService);
  const setProfessional = useWizardStore((s) => s.setProfessional);
  const setSchedule = useWizardStore((s) => s.setSchedule);
  const setPatient = useWizardStore((s) => s.setPatient);
  const setGuest = useWizardStore((s) => s.setGuest);
  const nextStep = useWizardStore((s) => s.nextStep);
  const prevStep = useWizardStore((s) => s.prevStep);
  const goToStep = useWizardStore((s) => s.goToStep);
  const reset = useWizardStore((s) => s.reset);
  const setSubmitting = useWizardStore((s) => s.setSubmitting);
  const setError = useWizardStore((s) => s.setError);

  // ---------------------------------------------------------------------
  // Mount cleanup — reset the store so the wizard always starts clean.
  // ---------------------------------------------------------------------
  useEffect(() => {
    reset();
  }, [reset]);

  // ---------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------
  const canAdvance = canAdvanceFromStep(currentStep, useWizardStore.getState());

  // ---------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------

  function handleNext() {
    if (!canAdvance) return;
    if (currentStep === 5) {
      // Step 5 → 6: always allowed (placeholder payment).
      goToStep(6);
    } else if (currentStep === 6) {
      void handleSubmit();
    } else {
      nextStep();
    }
  }

  function handlePrev() {
    prevStep();
  }

  function handleCancel() {
    reset();
    router.push("/dashboard/bookings");
  }

  async function handleSubmit() {
    if (!serviceId || !professionalId || !date || !startTime || !endTime) {
      setError("Faltan datos para crear la reserva.");
      return;
    }
    setError(null);
    setSubmitting(true);

    // The wizard stores the date as YYYY-MM-DD and the times as
    // HH:MM. The action expects a single `Date` for `startTime` (it
    // computes `endTime` from the service duration). Synthesize the
    // Date from the local date + start time so the slot is at the
    // user's wall-clock time, not UTC.
    const startDateTime = new Date(`${date}T${startTime}:00`);

    // Build the createBooking payload. The action accepts both
    // patient and guest flows. We always send the same shape — the
    // guest branch omits `patientId` (the action treats absent
    // patientId as "guest checkout") and the patient branch omits
    // the guest fields.
    const payload: Parameters<typeof createBooking>[0] = {
      serviceId,
      professionalId,
      startTime: startDateTime,
      ...(isGuest
        ? {
            guestName,
            guestPhone,
            ...(guestEmail ? { guestEmail } : {}),
          }
        : patientId
          ? { patientId }
          : {}),
      ...(notes ? { notes } : {}),
    };

    try {
      const result: BookingResult<{
        id: string;
        status: string;
        startTime: Date;
        endTime: Date;
      }> = await createBooking(payload);
      if (result.success) {
        router.push(`/dashboard/bookings/${result.data.id}`);
        return;
      }
      setError(result.error);
    } catch {
      setError("No se pudo crear la reserva. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header — back link + title */}
      <div className="flex items-start gap-3">
        <Button
          asChild
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mt-1"
          aria-label="Volver al listado"
        >
          <Link href="/dashboard/bookings">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Nuevo turno
          </h1>
          <p className="text-sm text-muted-foreground">
            Completá los datos para crear una nueva reserva.
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <WizardProgress currentStep={currentStep} />

      {/* Current step */}
      <div data-testid="step-container" data-step={currentStep}>
        {currentStep === 1 && (
          <WizardStepService
            selectedServiceId={serviceId}
            onSelect={setService}
          />
        )}
        {currentStep === 2 && (
          <WizardStepProfessional
            serviceId={serviceId}
            selectedProfessionalId={professionalId}
            onSelect={setProfessional}
          />
        )}
        {currentStep === 3 && (
          <WizardStepSchedule
            professionalId={professionalId}
            serviceId={serviceId}
            selectedDate={date}
            selectedStartTime={startTime}
            selectedEndTime={endTime}
            onDateChange={(d) => {
              // Resetting the schedule fields when the date changes
              // is handled inside the store via setSchedule (which
              // overwrites the previous date + times).
              setSchedule(d, startTime ?? "", endTime ?? "");
            }}
            onSelect={setSchedule}
          />
        )}
        {currentStep === 4 && (
          <WizardStepCustomer
            mode={isGuest ? "guest" : "existing"}
            onModeChange={(m) => {
              if (m === "guest" && !isGuest) {
                setGuest("", "", "");
              } else if (m === "existing" && isGuest) {
                // Clear the (already-absent) selectedPatient so
                // the "Paciente existente" tab starts unselected.
                setPatient(null);
              }
            }}
            selectedPatientId={patientId}
            onSelectPatient={setPatient}
            guestName={guestName}
            guestPhone={guestPhone}
            guestEmail={guestEmail}
            onGuestChange={setGuest}
          />
        )}
        {currentStep === 5 && selectedService && (
          // The cached `selectedService` carries name + price +
          // paymentType — the payment step is purely presentational
          // and renders those directly. No re-fetch, no placeholder.
          <WizardStepPayment
            serviceName={selectedService.name}
            servicePrice={selectedService.price}
            paymentType={selectedService.paymentType}
          />
        )}
        {currentStep === 6 &&
          selectedService &&
          selectedProfessional &&
          date &&
          startTime &&
          endTime && (
            // The cached service + professional objects carry the
            // real name + price + specialty info. Patient is null
            // in guest mode (the confirm step already handles that
            // branch via the `isGuest` + `guestName` props).
            <WizardStepConfirm
              service={selectedService}
              professional={selectedProfessional}
              date={date}
              startTime={startTime}
              endTime={endTime}
              isGuest={isGuest}
              patient={isGuest ? null : selectedPatient}
              guestName={guestName}
              guestPhone={guestPhone}
              guestEmail={guestEmail}
              isSubmitting={isSubmitting}
              error={error}
              onSubmit={handleSubmit}
            />
          )}
      </div>

      {/* Navigation */}
      <WizardNavigation
        currentStep={currentStep}
        canAdvance={canAdvance}
        isSubmitting={isSubmitting}
        onPrev={handlePrev}
        onNext={handleNext}
        onCancel={handleCancel}
      />
    </div>
  );
}
