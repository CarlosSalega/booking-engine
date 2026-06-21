/**
 * `BookingDetailActions` — the action-button bar at the bottom of the
 * booking detail page.
 *
 * Pulls the visible action set from the pure policy
 * `getAvailableActions(booking.status, role)` and wires each button to
 * the corresponding Server Action. The state machine and the RBAC for
 * which actions are valid live in the actions layer (`@/modules/bookings/
 * actions`); this component is the rendering + UX layer only.
 *
 * UX:
 * - One row of buttons, right-aligned on desktop, stacked on mobile.
 * - The "Reprogramar" button is a placeholder for PR #4 — a real date
 *   picker dialog needs a Dialog primitive that isn't installed in this
 *   project. Clicking it shows an info toast ("Próximamente") so the
 *   user knows the button works but the feature is on the roadmap.
 * - `useTransition` provides the loading state for every wired action;
 *   the buttons disable themselves while a transition is in flight.
 * - On success, `router.refresh()` re-fetches the page's Server
 *   Component data so the new status + badges render without a manual
 *   reload.
 * - On error, the action's user-facing Spanish message is toasted.
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import type { UserRoleType } from "@/modules/auth/domain/roles";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  markNoShow,
} from "@/modules/bookings/actions";
import { getAvailableActions, type BookingActionKey } from "@/modules/bookings/presentation/booking-detail-policy";

import { Button } from "@/components/ui/button";

interface BookingDetailActionsProps {
  booking: EnrichedBooking;
  role: UserRoleType;
}

// Map from policy action key → button visual variant. The destructive
// variant uses a red-tinted button; primary uses the brand color;
// secondary is a neutral outline.
const BUTTON_VARIANT: Record<
  BookingActionKey,
  "default" | "outline" | "destructive" | "secondary"
> = {
  confirm: "default",
  complete: "default",
  noShow: "secondary",
  reschedule: "outline",
  cancel: "destructive",
};

export function BookingDetailActions({ booking, role }: BookingDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const actions = getAvailableActions(booking.status, role);

  // Terminal statuses render no buttons — the parent already checks
  // `actions.length` to skip the section, but we short-circuit here too
  // so this component is safe to drop anywhere.
  if (actions.length === 0) {
    return null;
  }

  function handleReschedulePlaceholder() {
    // The reschedule action needs a date picker. Out of scope for PR #4
    // (no Dialog primitive installed). Show a neutral info toast so the
    // user understands the button is wired but the feature is on the
    // roadmap.
    toast("La función de reprogramar estará disponible próximamente.", {
      icon: "⏳",
    });
  }

  function dispatchAction(key: BookingActionKey) {
    if (key === "reschedule") {
      handleReschedulePlaceholder();
      return;
    }

    startTransition(async () => {
      try {
        const result = await runAction(key, booking.id);
        if (result.success) {
          toast.success("Reserva actualizada");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("No se pudo actualizar la reserva. Intentá de nuevo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      {actions.map((action) => {
        const variant = BUTTON_VARIANT[action.key];
        return (
          <Button
            key={action.key}
            type="button"
            variant={variant}
            disabled={isPending}
            onClick={() => dispatchAction(action.key)}
            data-action={action.key}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Server Action dispatcher — keeps the `startTransition` body flat.
// ---------------------------------------------------------------------------

async function runAction(
  key: BookingActionKey,
  bookingId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (key === "confirm") {
    return confirmBooking({ bookingId });
  }
  if (key === "cancel") {
    return cancelBooking({ bookingId });
  }
  if (key === "complete") {
    return completeBooking({ bookingId });
  }
  if (key === "noShow") {
    return markNoShow({ bookingId });
  }
  // "reschedule" is handled by the placeholder, but TypeScript still
  // needs an exhaustive branch. Surface a defensive error in case the
  // contract changes.
  return {
    success: false,
    error: "Acción no soportada en este momento.",
  };
}
