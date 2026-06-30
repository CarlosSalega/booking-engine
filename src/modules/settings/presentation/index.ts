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
 * PR #4 will add:
 *  - `TimezoneSelect`
 *  - `BusinessTab`, `BookingsTab`
 *
 * PR #5 will add:
 *  - `CancellationsTab`
 *  - `SettingsPage` (the Server Component body)
 *
 * The barrel is the public surface; deeper files (e.g. `settings-guard.tsx`)
 * remain importable for tests but should not be referenced from
 * production code.
 */

export { SettingsGuard } from "./settings-guard";
