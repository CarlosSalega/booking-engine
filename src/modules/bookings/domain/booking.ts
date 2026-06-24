export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  RESCHEDULED: "RESCHEDULED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
} as const;

export type BookingStatusType = (typeof BookingStatus)[keyof typeof BookingStatus];

/**
 * Booking status state machine.
 * - Self-transitions always return true.
 * - Terminal states (CANCELLED, COMPLETED, NO_SHOW, RESCHEDULED) have no outgoing edges.
 *
 * PENDING can go to RESCHEDULED so the calendar popover can offer
 * "Reprogramar" without first forcing the operator to Confirm the
 * booking. (CONFIRMED → RESCHEDULED is still the canonical path —
 * the calendar popover renders the same action on both states.)
 */
const TRANSITIONS: Record<BookingStatusType, BookingStatusType[]> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
    BookingStatus.AWAITING_PAYMENT,
    BookingStatus.RESCHEDULED,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.RESCHEDULED,
    BookingStatus.COMPLETED,
    BookingStatus.NO_SHOW,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.AWAITING_PAYMENT]: [
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.RESCHEDULED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.NO_SHOW]: [],
};

export function canTransition(
  from: BookingStatusType,
  to: BookingStatusType,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function calculateEndTime(
  startTime: Date,
  durationMinutes: number,
): Date {
  return new Date(startTime.getTime() + durationMinutes * 60000);
}
