/**
 * Barrel for the calendar components.
 *
 * Consumers (the dashboard page, tests) import from this module so the
 * public surface stays small and discoverable. The internal helpers
 * (utils, custom event components) are re-exported only when needed
 * for tests — production code should go through `BookingCalendar`.
 */

export { BookingCalendar } from "./booking-calendar";
export { BookingCalendarEvent } from "./booking-calendar-event";
export { BookingCalendarMonthEvent } from "./booking-calendar-month-event";
export {
  bookingToCalendarEvent,
  computeDateRange,
  STATUS_CALENDAR_COLORS,
  tzArg,
  type CalendarAppEvent,
  type CalendarColor,
  type CalendarViewName,
} from "./booking-calendar-utils";
