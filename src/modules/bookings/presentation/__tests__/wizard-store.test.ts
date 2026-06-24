/**
 * Tests for the booking creation wizard store.
 *
 * The wizard is a 6-step flow backed by a Zustand 5 store. Each step
 * collects a piece of the booking payload (service → professional →
 * schedule → customer → payment → confirm). The store is the single
 * source of truth for what's been collected so far; the page renders
 * steps by reading the store and updates the store as the user picks
 * options.
 *
 * What we verify:
 * - Initial state has every field at the documented default.
 * - `setService` resets all downstream fields (professional, date,
 *   time, patient, guest, notes) — and also clears the cached
 *   `selectedProfessional` / `selectedPatient` objects, not just
 *   their ids.
 * - `setProfessional` resets the schedule fields (date, start, end)
 *   but keeps the service. It also caches the full professional
 *   object.
 * - `setSchedule` writes date/start/end atomically.
 * - `setPatient` and `setGuest` are mutually exclusive — setting one
 *   clears the other.
 * - `nextStep` advances by 1 and never goes past 6.
 * - `prevStep` goes back by 1 and never goes below 1.
 * - `goToStep` clamps to [1, 6].
 * - `reset` returns the entire state to the initial values.
 * - `setSubmitting` / `setError` manage the UI state.
 *
 * The store is pure logic (no React, no Prisma, no async). Tests run
 * in plain Vitest with no DOM or module mocks.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  useWizardStore,
  WIZARD_TOTAL_STEPS,
  getInitialWizardState,
  canAdvanceFromStep,
} from "@/modules/bookings/presentation/wizard-store";
import type {
  PatientOption,
  ProfessionalOption,
  ServiceOption,
} from "@/modules/bookings/data/booking-data.types";

// ---------------------------------------------------------------------------
// Fixtures — full objects for the setters that now take objects, not ids.
// ---------------------------------------------------------------------------

const SERVICE_A: ServiceOption = {
  id: "svc-1",
  name: "Consulta General",
  price: 5000,
  durationMinutes: 30,
  paymentType: "FULL",
};

const SERVICE_B: ServiceOption = {
  ...SERVICE_A,
  id: "svc-2",
  name: "Consulta Especialista",
};

const PROF_1: ProfessionalOption = {
  id: "prof-1",
  userId: "user-prof-1",
  user: { name: "Dra. Pérez" },
  specialties: ["Kinesiología", "Deportes"],
};

const PROF_2: ProfessionalOption = {
  ...PROF_1,
  id: "prof-2",
  user: { name: "Dr. Gómez" },
};

const PAT_1: PatientOption = {
  id: "pat-1",
  user: { name: "Ana López", email: "ana@x.com" },
};

// ---------------------------------------------------------------------------
// Fresh store between tests — Zustand stores keep state across calls.
// ---------------------------------------------------------------------------

beforeEach(() => {
  useWizardStore.getState().reset();
});

describe("wizard store — initial state", () => {
  it("starts on step 1 with all step data empty", () => {
    const s = useWizardStore.getState();
    expect(s.currentStep).toBe(1);
    expect(s.serviceId).toBeNull();
    expect(s.selectedService).toBeNull();
    expect(s.professionalId).toBeNull();
    expect(s.selectedProfessional).toBeNull();
    expect(s.date).toBeNull();
    expect(s.startTime).toBeNull();
    expect(s.endTime).toBeNull();
    expect(s.patientId).toBeNull();
    expect(s.selectedPatient).toBeNull();
    expect(s.guestName).toBe("");
    expect(s.guestPhone).toBe("");
    expect(s.guestEmail).toBe("");
    expect(s.notes).toBe("");
    expect(s.isGuest).toBe(false);
    expect(s.isSubmitting).toBe(false);
    expect(s.error).toBeNull();
  });

  it("WIZARD_TOTAL_STEPS is 6", () => {
    expect(WIZARD_TOTAL_STEPS).toBe(6);
  });

  it("getInitialWizardState returns a fresh, independent object", () => {
    const a = getInitialWizardState();
    const b = getInitialWizardState();
    expect(a).toEqual(b);
    expect(a).not.toBe(b); // identity check — different reference
  });
});

describe("wizard store — setters", () => {
  it("setService writes the service id AND caches the full object", () => {
    useWizardStore.getState().setService(SERVICE_A);
    const s = useWizardStore.getState();
    expect(s.serviceId).toBe("svc-1");
    expect(s.selectedService).toEqual(SERVICE_A);
  });

  it("setService resets all downstream fields AND their cached objects", () => {
    // Pre-fill downstream state to prove the reset actually fires.
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setProfessional(PROF_1);
    useWizardStore.getState().setSchedule("2026-06-20", "10:00", "10:30");
    useWizardStore.getState().setPatient(PAT_1);
    useWizardStore.getState().setGuest("Ana", "351-1111", "ana@x.com");
    useWizardStore.getState().setNotes("extra");

    useWizardStore.getState().setService(SERVICE_B);

    const s = useWizardStore.getState();
    expect(s.serviceId).toBe("svc-2");
    expect(s.selectedService).toEqual(SERVICE_B);
    // Downstream ids reset...
    expect(s.professionalId).toBeNull();
    expect(s.date).toBeNull();
    expect(s.startTime).toBeNull();
    expect(s.endTime).toBeNull();
    expect(s.patientId).toBeNull();
    // ...AND the cached objects are also cleared (this is the bug
    // that motivated the refactor: a stale `selectedProfessional`
    // would point at a professional who may not offer the new
    // service).
    expect(s.selectedProfessional).toBeNull();
    expect(s.selectedPatient).toBeNull();
    expect(s.guestName).toBe("");
    expect(s.guestPhone).toBe("");
    expect(s.guestEmail).toBe("");
    expect(s.notes).toBe("");
    expect(s.isGuest).toBe(false);
  });

  it("setProfessional writes the id, caches the object, and resets schedule fields", () => {
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setSchedule("2026-06-20", "10:00", "10:30");

    useWizardStore.getState().setProfessional(PROF_2);

    const s = useWizardStore.getState();
    expect(s.professionalId).toBe("prof-2");
    expect(s.selectedProfessional).toEqual(PROF_2);
    expect(s.serviceId).toBe("svc-1"); // service preserved
    expect(s.selectedService).toEqual(SERVICE_A); // service object preserved
    expect(s.date).toBeNull();
    expect(s.startTime).toBeNull();
    expect(s.endTime).toBeNull();
  });

  it("setSchedule writes date/start/end atomically", () => {
    useWizardStore.getState().setSchedule("2026-06-20", "09:00", "09:30");
    const s = useWizardStore.getState();
    expect(s.date).toBe("2026-06-20");
    expect(s.startTime).toBe("09:00");
    expect(s.endTime).toBe("09:30");
  });

  it("setPatient writes the id + caches the object, clears guest fields", () => {
    useWizardStore.getState().setGuest("Ana", "351-1111", "ana@x.com");
    useWizardStore.getState().setPatient(PAT_1);

    const s = useWizardStore.getState();
    expect(s.patientId).toBe("pat-1");
    expect(s.selectedPatient).toEqual(PAT_1);
    expect(s.guestName).toBe("");
    expect(s.guestPhone).toBe("");
    expect(s.guestEmail).toBe("");
    expect(s.isGuest).toBe(false);
  });

  it("setPatient(null) clears the id AND the cached object", () => {
    useWizardStore.getState().setPatient(PAT_1);
    useWizardStore.getState().setPatient(null);

    const s = useWizardStore.getState();
    expect(s.patientId).toBeNull();
    expect(s.selectedPatient).toBeNull();
  });

  it("setGuest writes the guest info and clears patientId + selectedPatient", () => {
    useWizardStore.getState().setPatient(PAT_1);
    useWizardStore.getState().setGuest("Ana", "351-1111", "ana@x.com");

    const s = useWizardStore.getState();
    expect(s.patientId).toBeNull();
    expect(s.selectedPatient).toBeNull();
    expect(s.guestName).toBe("Ana");
    expect(s.guestPhone).toBe("351-1111");
    expect(s.guestEmail).toBe("ana@x.com");
    expect(s.isGuest).toBe(true);
  });

  it("setNotes writes the notes verbatim", () => {
    useWizardStore.getState().setNotes("paciente con muletas");
    expect(useWizardStore.getState().notes).toBe("paciente con muletas");
  });

  it("setSubmitting toggles isSubmitting", () => {
    useWizardStore.getState().setSubmitting(true);
    expect(useWizardStore.getState().isSubmitting).toBe(true);
    useWizardStore.getState().setSubmitting(false);
    expect(useWizardStore.getState().isSubmitting).toBe(false);
  });

  it("setError stores a string error or clears it", () => {
    useWizardStore.getState().setError("El horario está ocupado");
    expect(useWizardStore.getState().error).toBe("El horario está ocupado");
    useWizardStore.getState().setError(null);
    expect(useWizardStore.getState().error).toBeNull();
  });
});

describe("wizard store — step navigation", () => {
  it("nextStep advances by 1", () => {
    useWizardStore.getState().nextStep();
    expect(useWizardStore.getState().currentStep).toBe(2);
  });

  it("nextStep caps at WIZARD_TOTAL_STEPS", () => {
    const store = useWizardStore;
    for (let i = 0; i < 10; i++) {
      store.getState().nextStep();
    }
    expect(store.getState().currentStep).toBe(WIZARD_TOTAL_STEPS);
  });

  it("prevStep goes back by 1", () => {
    useWizardStore.getState().nextStep();
    useWizardStore.getState().nextStep();
    useWizardStore.getState().prevStep();
    expect(useWizardStore.getState().currentStep).toBe(2);
  });

  it("prevStep floors at 1", () => {
    useWizardStore.getState().prevStep();
    useWizardStore.getState().prevStep();
    expect(useWizardStore.getState().currentStep).toBe(1);
  });

  it("goToStep jumps to the given step", () => {
    useWizardStore.getState().goToStep(4);
    expect(useWizardStore.getState().currentStep).toBe(4);
  });

  it("goToStep clamps to the valid range", () => {
    useWizardStore.getState().goToStep(0);
    expect(useWizardStore.getState().currentStep).toBe(1);
    useWizardStore.getState().goToStep(99);
    expect(useWizardStore.getState().currentStep).toBe(WIZARD_TOTAL_STEPS);
  });
});

describe("wizard store — reset", () => {
  it("returns the entire state to initial", () => {
    // Mutate everything.
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setProfessional(PROF_1);
    useWizardStore.getState().setSchedule("2026-06-20", "10:00", "10:30");
    useWizardStore.getState().setGuest("Ana", "351-1111", "ana@x.com");
    useWizardStore.getState().setNotes("n");
    useWizardStore.getState().nextStep();
    useWizardStore.getState().nextStep();
    useWizardStore.getState().setSubmitting(true);
    useWizardStore.getState().setError("oops");

    useWizardStore.getState().reset();

    const s = useWizardStore.getState();
    const initial = getInitialWizardState();
    expect(s.currentStep).toBe(initial.currentStep);
    expect(s.serviceId).toBe(initial.serviceId);
    expect(s.selectedService).toBe(initial.selectedService);
    expect(s.professionalId).toBe(initial.professionalId);
    expect(s.selectedProfessional).toBe(initial.selectedProfessional);
    expect(s.date).toBe(initial.date);
    expect(s.startTime).toBe(initial.startTime);
    expect(s.endTime).toBe(initial.endTime);
    expect(s.patientId).toBe(initial.patientId);
    expect(s.selectedPatient).toBe(initial.selectedPatient);
    expect(s.guestName).toBe(initial.guestName);
    expect(s.guestPhone).toBe(initial.guestPhone);
    expect(s.guestEmail).toBe(initial.guestEmail);
    expect(s.notes).toBe(initial.notes);
    expect(s.isSubmitting).toBe(initial.isSubmitting);
    expect(s.error).toBe(initial.error);
  });
});

// ---------------------------------------------------------------------------
// canAdvanceFromStep — pure helper that decides whether the user can
// leave the current step. Used by the navigation bar to enable/disable
// "Siguiente" and by the nextStep action itself.
// ---------------------------------------------------------------------------

describe("canAdvanceFromStep", () => {
  it("blocks step 1 when no service is selected", () => {
    expect(canAdvanceFromStep(1, useWizardStore.getState())).toBe(false);
  });

  it("allows step 1 when a service is selected", () => {
    useWizardStore.getState().setService(SERVICE_A);
    expect(canAdvanceFromStep(1, useWizardStore.getState())).toBe(true);
  });

  it("blocks step 2 when no professional is selected", () => {
    useWizardStore.getState().setService(SERVICE_A);
    expect(canAdvanceFromStep(2, useWizardStore.getState())).toBe(false);
  });

  it("allows step 2 when a professional is selected", () => {
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setProfessional(PROF_1);
    expect(canAdvanceFromStep(2, useWizardStore.getState())).toBe(true);
  });

  it("blocks step 3 when schedule is incomplete", () => {
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setProfessional(PROF_1);
    expect(canAdvanceFromStep(3, useWizardStore.getState())).toBe(false);
  });

  it("allows step 3 when date + start + end are all set", () => {
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setProfessional(PROF_1);
    useWizardStore.getState().setSchedule("2026-06-20", "10:00", "10:30");
    expect(canAdvanceFromStep(3, useWizardStore.getState())).toBe(true);
  });

  it("blocks step 4 when no patient or guest is selected", () => {
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setProfessional(PROF_1);
    useWizardStore.getState().setSchedule("2026-06-20", "10:00", "10:30");
    expect(canAdvanceFromStep(4, useWizardStore.getState())).toBe(false);
  });

  it("allows step 4 when a patient is selected", () => {
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setProfessional(PROF_1);
    useWizardStore.getState().setSchedule("2026-06-20", "10:00", "10:30");
    useWizardStore.getState().setPatient(PAT_1);
    expect(canAdvanceFromStep(4, useWizardStore.getState())).toBe(true);
  });

  it("allows step 4 when a guest name + phone is provided", () => {
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setProfessional(PROF_1);
    useWizardStore.getState().setSchedule("2026-06-20", "10:00", "10:30");
    useWizardStore.getState().setGuest("Ana", "351-1111", "ana@x.com");
    expect(canAdvanceFromStep(4, useWizardStore.getState())).toBe(true);
  });

  it("blocks step 4 when guest info is missing phone", () => {
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setProfessional(PROF_1);
    useWizardStore.getState().setSchedule("2026-06-20", "10:00", "10:30");
    useWizardStore.getState().setGuest("Ana", "", "ana@x.com");
    expect(canAdvanceFromStep(4, useWizardStore.getState())).toBe(false);
  });

  it("step 5 (payment) is always allowed to advance (placeholder)", () => {
    useWizardStore.getState().setService(SERVICE_A);
    useWizardStore.getState().setProfessional(PROF_1);
    useWizardStore.getState().setSchedule("2026-06-20", "10:00", "10:30");
    useWizardStore.getState().setPatient(PAT_1);
    expect(canAdvanceFromStep(5, useWizardStore.getState())).toBe(true);
  });

  it("out-of-range step returns false (defensive)", () => {
    expect(canAdvanceFromStep(0, useWizardStore.getState())).toBe(false);
    expect(canAdvanceFromStep(99, useWizardStore.getState())).toBe(false);
  });
});
