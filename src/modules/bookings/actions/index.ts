// Bookings actions — barrel export.
//
// Each action is exported under both its bare name (for the wizard and
// detail page) and via the `*.action` module re-export pattern used by
// the auth module. The Input/Result types are also re-exported so
// consumers can do a single import from `@/modules/bookings/actions`.

export { cancelBooking } from "./cancel-booking.action";
export { completeBooking } from "./complete-booking.action";
export { confirmBooking } from "./confirm-booking.action";
export { createBooking } from "./create-booking.action";
export { markNoShow } from "./mark-no-show.action";
export { rescheduleBooking } from "./reschedule-booking.action";

export {
  type BookingError,
  type BookingResult,
  type BookingSuccess,
  type CancelBookingInput,
  type CompleteBookingInput,
  type ConfirmBookingInput,
  type CreateBookingInput,
  type MarkNoShowInput,
  type RescheduleBookingInput,
} from "./booking-actions.types";
