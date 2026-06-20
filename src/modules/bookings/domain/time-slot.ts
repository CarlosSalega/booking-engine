/**
 * TimeSlot value object — represents a time interval with start and end.
 * No identity, immutable by convention. Boundary semantics:
 * - isValidTimeSlot: startTime < endTime (strict)
 * - isOverlapping: a.startTime < b.endTime && b.startTime < a.endTime (strict)
 *   → adjacent slots (a.endTime === b.startTime) do NOT overlap.
 */
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export function isValidTimeSlot(ts: TimeSlot): boolean {
  return ts.startTime < ts.endTime;
}

export function isOverlapping(a: TimeSlot, b: TimeSlot): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}
