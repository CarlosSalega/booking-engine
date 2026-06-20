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
 */
const TRANSITIONS: Record<BookingStatusType, BookingStatusType[]> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
    BookingStatus.AWAITING_PAYMENT,
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
