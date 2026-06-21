/**
 * Booking detail page — pure policy module.
 *
 * The detail page renders action buttons (Confirmar, Cancelar,
 * Completar, No asistió, Reprogramar) gated by the booking status and
 * the current viewer's role. The state machine in
 * `@/modules/bookings/domain/booking` is the source of truth for which
 * transitions are valid; this module translates that into a list of
 * clickable buttons.
 *
 * Pure: no React, no Next.js, no Prisma. The buttons themselves live
 * in `BookingDetailActions` (a Client Component). This separation lets
 * us unit-test the policy without rendering anything.
 *
 * RBAC note: the data layer (PR #1) scopes the booking list by
 * `professionalUserId` for PROFESSIONAL users, and each Server Action
 * (PR #2) re-checks the ownership. The UI policy here does NOT need a
 * role check — the same set of buttons is shown regardless of role,
 * because the action server-side will reject unauthorized calls with
 * "No autorizado". The `role` parameter is reserved for future
 * per-role UI policy (e.g. hiding Reschedule from SECRETARYs).
 */

import {
  BookingStatus,
  type BookingStatusType,
  canTransition,
} from "@/modules/bookings/domain/booking";
import type { UserRoleType } from "@/modules/auth/domain/roles";

/** Keys for the 5 actions the detail page can render. */
export type BookingActionKey =
  | "confirm"
  | "cancel"
  | "complete"
  | "noShow"
  | "reschedule";

/**
 * Visual style of an action button. Maps to the shadcn/ui Button
 * `variant` prop in the actions component.
 * - "primary"      — call-to-action, green/primary fill
 * - "secondary"    — neutral, less prominent
 * - "destructive"  — warning, red
 */
export type ActionVariant = "primary" | "secondary" | "destructive";

/** Descriptor for one action button. */
export interface ActionDescriptor {
  key: BookingActionKey;
  label: string;
  variant: ActionVariant;
}

// ---------------------------------------------------------------------------
// Catalog — every action's label + visual style in Argentinian Spanish.
// Single source of truth: the labels are referenced by both the policy
// and the actions component so a change here propagates everywhere.
// ---------------------------------------------------------------------------

const ACTION_CATALOG: Record<BookingActionKey, ActionDescriptor> = {
  confirm: { key: "confirm", label: "Confirmar", variant: "primary" },
  cancel: { key: "cancel", label: "Cancelar", variant: "destructive" },
  complete: { key: "complete", label: "Completar", variant: "primary" },
  noShow: { key: "noShow", label: "No asistió", variant: "secondary" },
  reschedule: {
    key: "reschedule",
    label: "Reprogramar",
    variant: "secondary",
  },
};

/**
 * Returns the list of action buttons that should render on the detail
 * page for the given booking status.
 *
 * The role parameter is currently unused — visibility is purely a
 * function of status. The parameter is kept for future per-role UI
 * policy (e.g. hiding destructive actions from specific roles) without
 * forcing a breaking change on callers.
 */
export function getAvailableActions(
  status: BookingStatusType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _role?: UserRoleType,
): ActionDescriptor[] {
  // Helper: a target status is a "real" transition only when it differs
  // from the current status. `canTransition` returns `true` for self
  // transitions (idempotent stays), but a button labelled "Cancelar"
  // must never appear on a CANCELLED booking.
  const canGo = (target: BookingStatusType): boolean =>
    target !== status && canTransition(status, target);

  // Insertion order IS the display order. The first match becomes the
  // leftmost button; cancel and reschedule land at the right end as
  // the least-common / destructive actions.
  const keys: BookingActionKey[] = [];

  if (canGo(BookingStatus.CONFIRMED)) keys.push("confirm");
  if (canGo(BookingStatus.COMPLETED)) keys.push("complete");
  if (canGo(BookingStatus.NO_SHOW)) keys.push("noShow");
  if (canGo(BookingStatus.CANCELLED)) keys.push("cancel");
  if (canGo(BookingStatus.RESCHEDULED)) keys.push("reschedule");

  return keys.map((key) => ACTION_CATALOG[key]);
}
