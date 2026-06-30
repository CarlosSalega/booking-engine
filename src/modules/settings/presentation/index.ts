/**
 * Settings module — presentation barrel.
 *
 * Re-exports the Client Component(s) the settings page mounts.
 * The Server Component page lives in `src/app/(dashboard)/dashboard/settings/page.tsx`
 * and imports directly from this module's files (not via the barrel,
 * per the team's tree-shaking preference for non-component barrels).
 *
 * PR #3 ships:
 *  - `SettingsGuard` — wraps the page and enforces per-role access.
 *
 * PR #4 adds:
 *  - `TimezoneSelect` — native <select> with curated IANA list.
 *  - `BusinessTab`, `BookingsTab` — `useTransition + useState` forms
 *    that call the corresponding Server Actions.
 *
 * PR #5 adds:
 *  - `CancellationsTab` — Switch + number input form, toggle
 *    disables the hours field per spec.
 *  - `SettingsPage` (RSC) — the data-dependent body of the route.
 *    Lives here so the App Router file stays a thin wrapper.
 *
 * The barrel is the public surface; deeper files (e.g. `settings-guard.tsx`)
 * remain importable for tests but should not be referenced from
 * production code.
 */

export { SettingsGuard } from "./settings-guard";
export {
  TimezoneSelect,
  TIMEZONES,
  DEFAULT_TIMEZONE,
  type TimezoneValue,
} from "./timezone-select";
export { BusinessTab } from "./tabs/business-tab";
export { BookingsTab } from "./tabs/bookings-tab";
export { CancellationsTab } from "./tabs/cancellations-tab";
export { SettingsPage } from "./settings-page";
