/**
 * Booking creation wizard — Zustand 5 store.
 *
 * Six-step flow: service → professional → schedule → customer → payment
 * → confirm. The store is the single source of truth for what's been
 * collected so far; the wizard page and step components read from and
 * write to it.
 *
 * Design notes (matches `openspec/changes/bookings/design.md` AD4):
 * - **No `persist` middleware** — the wizard is local to a single page
 *   mount. Stale data between visits is bad UX; the `NewBookingPage`
 *   calls `useWizardStore.getState().reset()` on mount so the form
 *   always starts clean.
 * - **`setService` resets downstream fields** — if the user picks a
 *   different service after they already chose a professional, the old
 *   professional may not offer the new service, so the chain is
 *   cleared. This mirrors how real booking systems behave.
 * - **`canAdvanceFromStep` is a pure helper** — the navigation bar uses
 *   it to enable/disable "Siguiente", and the page can also use it to
 *   validate before submit.
 *
 * Pure module: no React, no Next.js, no Prisma. The store itself uses
 * Zustand 5's `create` with a single `set` argument.
 */

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Total number of wizard steps. Step N is 1-indexed. */
export const WIZARD_TOTAL_STEPS = 6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the wizard's reactive state. */
export interface WizardState {
  // Step data
  serviceId: string | null;
  professionalId: string | null;
  /** Calendar day in YYYY-MM-DD local time. */
  date: string | null;
  /** Start time in HH:mm (24h). */
  startTime: string | null;
  /** End time in HH:mm (24h). */
  endTime: string | null;
  /** Registered patient id; null = no patient selected. */
  patientId: string | null;
  /** True when the user toggled "Invitado" and provided guest info. */
  isGuest: boolean;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  notes: string;

  // UI state
  /** Current step, 1-indexed, clamped to [1, WIZARD_TOTAL_STEPS]. */
  currentStep: number;
  isSubmitting: boolean;
  /** Last user-facing error from the createBooking server action. */
  error: string | null;

  // Actions
  setService: (serviceId: string) => void;
  setProfessional: (professionalId: string) => void;
  setSchedule: (date: string, startTime: string, endTime: string) => void;
  setPatient: (patientId: string) => void;
  setGuest: (name: string, phone: string, email: string) => void;
  setNotes: (notes: string) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
}

/** Returns the initial state. Used by `reset` and by tests. */
export function getInitialWizardState() {
  return {
    serviceId: null,
    professionalId: null,
    date: null,
    startTime: null,
    endTime: null,
    patientId: null,
    isGuest: false,
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    notes: "",
    currentStep: 1,
    isSubmitting: false,
    error: null,
  } as const;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const INITIAL = getInitialWizardState();

/**
 * The booking wizard store. Exported as a hook (`useWizardStore`) for
 * components and as `.getState()` for callers outside React (e.g. the
 * page reset on mount).
 */
export const useWizardStore = create<WizardState>()((set) => ({
  ...INITIAL,

  setService: (serviceId) =>
    set({
      serviceId,
      // Downstream reset — see design.md AD4.
      professionalId: null,
      date: null,
      startTime: null,
      endTime: null,
      patientId: null,
      isGuest: false,
      guestName: "",
      guestPhone: "",
      guestEmail: "",
      notes: "",
      error: null,
    }),

  setProfessional: (professionalId) =>
    set({
      professionalId,
      // Schedule becomes invalid for the new professional.
      date: null,
      startTime: null,
      endTime: null,
    }),

  setSchedule: (date, startTime, endTime) => set({ date, startTime, endTime }),

  setPatient: (patientId) =>
    set({
      patientId,
      // Switch to patient mode → clear guest fields.
      isGuest: false,
      guestName: "",
      guestPhone: "",
      guestEmail: "",
    }),

  setGuest: (guestName, guestPhone, guestEmail) =>
    set({
      guestName,
      guestPhone,
      guestEmail,
      isGuest: true,
      patientId: null,
    }),

  setNotes: (notes) => set({ notes }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error }),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, WIZARD_TOTAL_STEPS),
    })),
  prevStep: () =>
    set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  goToStep: (step) =>
    set({ currentStep: Math.max(1, Math.min(step, WIZARD_TOTAL_STEPS)) }),

  reset: () => set({ ...INITIAL }),
}));

// ---------------------------------------------------------------------------
// Pure helper — step validation
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the user can leave the given step. Used by the
 * navigation bar to enable/disable "Siguiente" and by the page on
 * submit to short-circuit invalid submissions.
 *
 * Per-step rules (from design.md AD4):
 * - 1 → 2: `serviceId !== null`
 * - 2 → 3: `professionalId !== null`
 * - 3 → 4: `date !== null && startTime !== null && endTime !== null`
 * - 4 → 5: `patientId !== null` OR (`guestName !== "" && guestPhone !== ""`)
 * - 5 → 6: always allowed (placeholder payment step)
 *
 * Out-of-range steps return `false` defensively — the caller is
 * expected to clamp `currentStep` to [1, WIZARD_TOTAL_STEPS].
 */
export function canAdvanceFromStep(step: number, state: WizardState): boolean {
  switch (step) {
    case 1:
      return state.serviceId !== null;
    case 2:
      return state.professionalId !== null;
    case 3:
      return (
        state.date !== null && state.startTime !== null && state.endTime !== null
      );
    case 4:
      return (
        state.patientId !== null ||
        (state.guestName.trim() !== "" && state.guestPhone.trim() !== "")
      );
    case 5:
      // Payment is a placeholder — always allowed to advance.
      return true;
    default:
      return false;
  }
}
