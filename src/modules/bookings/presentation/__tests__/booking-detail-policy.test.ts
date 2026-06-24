/**
 * Tests for `booking-detail-policy` — the pure module that decides
 * which action buttons show on the booking detail page.
 *
 * The function `getAvailableActions(status, role)` is the single source
 * of truth for action visibility. It consumes the `canTransition` state
 * machine so any update to the state machine is reflected here
 * automatically.
 *
 * No React, no Next.js, no Prisma — these tests are pure unit tests.
 */

import { describe, expect, it } from "vitest";

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import { USER_ROLE, type UserRoleType } from "@/modules/auth/domain/roles";

import {
  getAvailableActions,
  type BookingActionKey,
} from "@/modules/bookings/presentation/booking-detail-policy";

describe("getAvailableActions", () => {
  // -------------------------------------------------------------------------
  // Happy path — status → expected action set
  // -------------------------------------------------------------------------

  it("returns [confirm, cancel, reschedule] for PENDING (calendar spec scenario)", () => {
    // The calendar popover spec requires PENDING bookings to expose
    // "Reprogramar" alongside Confirmar / Cancelar. The state machine
    // accepts PENDING → RESCHEDULED, so the policy surfaces it here.
    const actions = getAvailableActions(BookingStatus.PENDING, USER_ROLE.ADMIN);
    expect(actions.map((a) => a.key)).toEqual(["confirm", "cancel", "reschedule"]);
  });

  it("returns [confirm, cancel] for AWAITING_PAYMENT", () => {
    const actions = getAvailableActions(
      BookingStatus.AWAITING_PAYMENT,
      USER_ROLE.ADMIN,
    );
    expect(actions.map((a) => a.key)).toEqual(["confirm", "cancel"]);
  });

  it("returns [complete, noShow, cancel, reschedule] for CONFIRMED (the spec scenario)", () => {
    // From the spec:
    //   GIVEN CONFIRMED, role=SECRETARY → THEN Reschedule/Complete/No-Show/Cancel buttons
    const actions = getAvailableActions(BookingStatus.CONFIRMED, USER_ROLE.SECRETARY);
    expect(actions.map((a) => a.key)).toEqual([
      "complete",
      "noShow",
      "cancel",
      "reschedule",
    ]);
  });

  // -------------------------------------------------------------------------
  // Terminal states — no action buttons
  // -------------------------------------------------------------------------

  it("returns [] for terminal status CANCELLED", () => {
    const actions = getAvailableActions(BookingStatus.CANCELLED, USER_ROLE.ADMIN);
    expect(actions).toEqual([]);
  });

  it("returns [] for terminal status COMPLETED", () => {
    const actions = getAvailableActions(BookingStatus.COMPLETED, USER_ROLE.ADMIN);
    expect(actions).toEqual([]);
  });

  it("returns [] for terminal status NO_SHOW", () => {
    const actions = getAvailableActions(BookingStatus.NO_SHOW, USER_ROLE.ADMIN);
    expect(actions).toEqual([]);
  });

  it("returns [] for terminal status RESCHEDULED", () => {
    const actions = getAvailableActions(BookingStatus.RESCHEDULED, USER_ROLE.ADMIN);
    expect(actions).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Triangulation — exhaustive 7-status coverage
  // -------------------------------------------------------------------------

  it("covers all 7 BookingStatus values (exhaustive — no missing action sets)", () => {
    const all: BookingStatusType[] = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.RESCHEDULED,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
      BookingStatus.AWAITING_PAYMENT,
    ];
    for (const status of all) {
      // Just assert the function runs and returns an array — the explicit
      // assertions above cover the specific shape of each set.
      const actions = getAvailableActions(status, USER_ROLE.ADMIN);
      expect(Array.isArray(actions)).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // Role-agnostic visibility — UI is the same; RBAC is enforced at the
  // data layer and the action layer, not the UI policy.
  // -------------------------------------------------------------------------

  it("returns the same actions for ADMIN, SECRETARY, and PROFESSIONAL on CONFIRMED", () => {
    const allRoles: UserRoleType[] = [
      USER_ROLE.ADMIN,
      USER_ROLE.SECRETARY,
      USER_ROLE.PROFESSIONAL,
    ];
    for (const role of allRoles) {
      const keys = getAvailableActions(BookingStatus.CONFIRMED, role).map(
        (a) => a.key,
      );
      expect(keys).toEqual(["complete", "noShow", "cancel", "reschedule"]);
    }
  });

  it("works without the role argument (defaults to undefined)", () => {
    // The role argument is reserved for future per-role UI policy; today
    // the visibility depends only on status. Callers should still be able
    // to omit the role.
    const actions = getAvailableActions(BookingStatus.CONFIRMED);
    expect(actions.map((a) => a.key)).toEqual([
      "complete",
      "noShow",
      "cancel",
      "reschedule",
    ]);
  });

  // -------------------------------------------------------------------------
  // Argentinian Spanish labels — every action gets a label
  // -------------------------------------------------------------------------

  it("labels every action in Argentinian Spanish", () => {
    // Walk every status, accumulate the labels, and assert each of the
    // 5 actions has the expected label. (No single status exposes all 5.)
    const seen = new Map<BookingActionKey, string>();
    const all: BookingStatusType[] = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.RESCHEDULED,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
      BookingStatus.AWAITING_PAYMENT,
    ];
    for (const status of all) {
      for (const a of getAvailableActions(status, USER_ROLE.ADMIN)) {
        seen.set(a.key, a.label);
      }
    }
    expect(seen.get("confirm")).toBe("Confirmar");
    expect(seen.get("cancel")).toBe("Cancelar");
    expect(seen.get("complete")).toBe("Completar");
    expect(seen.get("noShow")).toBe("No asistió");
    expect(seen.get("reschedule")).toBe("Reprogramar");
  });

  it("marks destructive actions with a destructive variant", () => {
    const actions = getAvailableActions(BookingStatus.CONFIRMED, USER_ROLE.ADMIN);
    const byKey = Object.fromEntries(actions.map((a) => [a.key, a]));
    expect(byKey["cancel"]?.variant).toBe("destructive");
    // The other CONFIRMED actions are non-destructive (complete = primary,
    // reschedule/noShow = secondary).
    expect(byKey["complete"]?.variant).not.toBe("destructive");
    expect(byKey["noShow"]?.variant).not.toBe("destructive");
    expect(byKey["reschedule"]?.variant).not.toBe("destructive");
  });
});
