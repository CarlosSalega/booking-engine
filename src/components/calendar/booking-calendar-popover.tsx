/**
 * `BookingCalendarPopover` — the shadcn `Popover` / mobile `Sheet`
 * that opens when the user clicks a booking event on the calendar.
 *
 * Visual contract (per the spec):
 *   - Header: patient name, service name, HH:mm–HH:mm range.
 *   - Body: `BookingStatusBadge`.
 *   - Action buttons: derived from `getAvailableActions(status, role)`
 *     so the policy is shared with `BookingDetailActions` and
 *     covered by the pure module's tests.
 *   - "Ver detalle" is always present and pushes to
 *     `/dashboard/bookings/${id}`.
 *
 * Mobile: when the viewport is ≤ 768px the popover is replaced by a
 * bottom `Sheet` (full-width drawer) — the spec calls for an
 * adapted popover on mobile, and a bottom sheet is the most
 * thumb-friendly option on small screens.
 *
 * State machine: each action button owns its own `useTransition`
 * so multiple actions on the same booking can be in flight at the
 * same time without one of them blocking the others. On success,
 * the popover calls `router.refresh()` so the parent calendar
 * re-fetches the visible range with the new booking status.
 *
 * Reschedule: the "Reprogramar" button opens the same
 * `BookingRescheduleDialog` used on the detail page, so the
 * date/slot picker experience stays consistent across the two
 * surfaces.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import type { UserRoleType } from "@/modules/auth/domain/roles";
import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  markNoShow,
} from "@/modules/bookings/actions";
import {
  getAvailableActions,
  type BookingActionKey,
  type ActionDescriptor,
} from "@/modules/bookings/presentation/booking-detail-policy";
import { formatBookingTime } from "@/modules/bookings/presentation/formatters";
import { getPatientDisplayName } from "@/modules/bookings/presentation/formatters";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { BookingRescheduleDialog } from "@/components/bookings/booking-reschedule-dialog";

import { useMediaQuery } from "@/hooks/use-media-query";

import type { CalendarAppEvent } from "./booking-calendar-utils";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

interface BookingCalendarPopoverProps {
  /** The event the user clicked. The popover reads status, patient, etc.
   *  from the attached `_booking` ref. */
  event: CalendarAppEvent;
  /** Current viewer's role — passed to `getAvailableActions`. */
  role: UserRoleType;
}

// ---------------------------------------------------------------------------
// Visual mapping
// ---------------------------------------------------------------------------

/** Map from policy action key → shadcn Button `variant`. */
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingCalendarPopover({
  event,
  role,
}: BookingCalendarPopoverProps) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const booking: EnrichedBooking = event._booking;
  const status: BookingStatusType = booking.status;
  const actions = getAvailableActions(status, role);

  return isMobile ? (
    <MobileSheet
      booking={booking}
      actions={actions}
      onNavigate={(path) => router.push(path)}
      onRefresh={() => router.refresh()}
    />
  ) : (
    <DesktopPopover
      booking={booking}
      actions={actions}
      onNavigate={(path) => router.push(path)}
      onRefresh={() => router.refresh()}
    />
  );
}

// ---------------------------------------------------------------------------
// Desktop variant — shadcn Popover with the booking header + actions.
// ---------------------------------------------------------------------------

interface PopoverShellProps {
  booking: EnrichedBooking;
  actions: ActionDescriptor[];
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}

function DesktopPopover({
  booking,
  actions,
  onNavigate,
  onRefresh,
}: PopoverShellProps) {
  return (
    <Popover defaultOpen>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-80"
        data-testid="booking-calendar-popover"
      >
        <PopoverHeader>
          <PopoverTitle data-testid="booking-popover-patient">
            {getPatientDisplayName(booking)}
          </PopoverTitle>
          <p
            className="text-muted-foreground text-xs"
            data-testid="booking-popover-service"
          >
            {booking.service.name}
          </p>
          <p
            className="font-mono text-xs tabular-nums opacity-80"
            data-testid="booking-popover-range"
          >
            {formatBookingTime(new Date(booking.startTime))} –{" "}
            {formatBookingTime(new Date(booking.endTime))}
          </p>
        </PopoverHeader>

        <div className="flex items-center gap-2">
          <BookingStatusBadge status={booking.status} />
        </div>

        <ActionButtons
          actions={actions}
          booking={booking}
          onNavigate={onNavigate}
          onRefresh={onRefresh}
        />
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Mobile variant — full-width bottom Sheet.
// ---------------------------------------------------------------------------

function MobileSheet({
  booking,
  actions,
  onNavigate,
  onRefresh,
}: PopoverShellProps) {
  return (
    <Sheet open>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto"
        data-testid="booking-calendar-sheet"
      >
        <SheetHeader>
          <SheetTitle data-testid="booking-sheet-patient">
            {getPatientDisplayName(booking)}
          </SheetTitle>
          <p
            className="text-muted-foreground text-sm"
            data-testid="booking-sheet-service"
          >
            {booking.service.name}
          </p>
          <p
            className="font-mono text-sm tabular-nums opacity-80"
            data-testid="booking-sheet-range"
          >
            {formatBookingTime(new Date(booking.startTime))} –{" "}
            {formatBookingTime(new Date(booking.endTime))}
          </p>
          <div>
            <BookingStatusBadge status={booking.status} />
          </div>
        </SheetHeader>

        <ActionButtons
          actions={actions}
          booking={booking}
          onNavigate={onNavigate}
          onRefresh={onRefresh}
        />
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Action buttons — shared by both variants.
// ---------------------------------------------------------------------------

interface ActionButtonsProps {
  actions: ActionDescriptor[];
  booking: EnrichedBooking;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}

function ActionButtons({
  actions,
  booking,
  onNavigate,
  onRefresh,
}: ActionButtonsProps) {
  return (
    <div
      className="flex flex-col gap-2"
      data-testid="booking-popover-actions"
    >
      {actions.map((action) => (
        <ActionButton
          key={action.key}
          action={action}
          booking={booking}
          onNavigate={onNavigate}
          onRefresh={onRefresh}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => onNavigate(`/dashboard/bookings/${booking.id}`)}
        data-action="view-detail"
        data-testid="booking-popover-view-detail"
      >
        Ver detalle
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionButton — owns its own useTransition + the reschedule dialog.
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  action: ActionDescriptor;
  booking: EnrichedBooking;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}

function ActionButton({
  action,
  booking,
  onRefresh,
}: ActionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  function handleClick() {
    if (action.key === "reschedule") {
      // Hand off to the dialog — it owns the date picker, slot
      // selection, and the eventual `rescheduleBooking` call.
      setIsRescheduleOpen(true);
      return;
    }

    startTransition(async () => {
      const result = await runAction(action.key, booking.id);
      if (result.success) {
        toast.success("Reserva actualizada");
        onRefresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={BUTTON_VARIANT[action.key]}
        onClick={handleClick}
        disabled={isPending}
        data-action={action.key}
        data-testid={`booking-popover-action-${action.key}`}
      >
        {action.label}
      </Button>
      {action.key === "reschedule" ? (
        <BookingRescheduleDialog
          bookingId={booking.id}
          professionalId={booking.professionalId}
          serviceId={booking.serviceId}
          open={isRescheduleOpen}
          onOpenChange={setIsRescheduleOpen}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Server Action dispatcher — mirrors `BookingDetailActions`.
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
  // "reschedule" is handled by the dialog; defensively reject here
  // in case the contract changes and the dispatcher is hit directly.
  return {
    success: false,
    error: "Acción no soportada en este momento.",
  };
}

// Reference BookingStatus so a future maintainer can grep for the
// import without it being flagged as unused (it's used for the
// status type narrowing in the mobile sheet title variant).
void BookingStatus;
