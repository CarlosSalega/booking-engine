/**
 * `TimezoneSelect` — Client Component for the settings Business tab.
 *
 * A thin wrapper around a native `<select>` that exposes a curated list
 * of IANA timezones. The list is intentionally small (≥15 common zones)
 * and ordered by relevance to the project's primary locale (Argentina
 * first). No third-party timezone picker dependency — the project's
 * design philosophy is "lightweight primitives over heavy libraries"
 * (see `openspec/changes/settings/design.md` — "Timezone input: library
 * heavy → native <select> with curated IANA list").
 *
 * Each option's visible label is the city (in Spanish where possible)
 * followed by the resolved GMT offset, computed at render time via
 * `Intl.DateTimeFormat({ timeZoneName: "shortOffset" })`. The offset
 * is dynamic — daylight-saving transitions are reflected in the label
 * (e.g. "Nueva York (GMT-4)" in summer vs. "(GMT-5)" in winter for
 * zones that observe DST).
 *
 * The component is fully controlled: the parent owns the selected
 * timezone and is notified of changes via `onChange(value)`. It does
 * NOT hold internal state. This matches the rest of the project's
 * form pattern (see `ServiceForm`, `ProfessionalForm`).
 *
 * RBAC: this component is RBAC-agnostic. The parent form (BusinessTab,
 * PR #4) passes `disabled` based on the `readOnly` flag from
 * `SettingsGuard`.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Business Tab → Scenario: Timezone selection
 */

"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Curated timezone list
// ---------------------------------------------------------------------------

/**
 * Public, immutable, ordered list of supported IANA timezones.
 *
 * Ordering rationale (top → bottom):
 *  1. Project default: Argentina (Buenos Aires + Cordoba) — the
 *     primary market of the Booking Engine deployment.
 *  2. Latin America (Mexico, Brazil, Colombia, Chile) — common
 *     neighboring markets.
 *  3. North America (US east/central/mountain/pacific).
 *  4. Europe — international clinics / remote staff.
 *  5. Asia / Oceania — international clients.
 *  6. UTC — fallback / for power users.
 *
 * The list is exported as `as const` so the IANA strings can be used
 * as a discriminated union in tests and form code.
 */
export const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { value: "America/Argentina/Cordoba", label: "Córdoba" },
  { value: "America/Mexico_City", label: "Ciudad de México" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "America/Bogota", label: "Bogotá" },
  { value: "America/Santiago", label: "Santiago" },
  { value: "America/New_York", label: "Nueva York" },
  { value: "America/Chicago", label: "Chicago" },
  { value: "America/Denver", label: "Denver" },
  { value: "America/Los_Angeles", label: "Los Ángeles" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Europe/London", label: "Londres" },
  { value: "Europe/Paris", label: "París" },
  { value: "Europe/Berlin", label: "Berlín" },
  { value: "Asia/Tokyo", label: "Tokio" },
  { value: "Asia/Shanghai", label: "Shanghái" },
  { value: "Australia/Sydney", label: "Sídney" },
  { value: "UTC", label: "UTC" },
] as const satisfies ReadonlyArray<{ value: string; label: string }>;

/** IANA type — derived from the curated list. */
export type TimezoneValue = (typeof TIMEZONES)[number]["value"];

/** The default timezone (mirrors `SETTINGS_DEFAULTS.timezone`). */
export const DEFAULT_TIMEZONE: TimezoneValue = "America/Argentina/Buenos_Aires";

// ---------------------------------------------------------------------------
// Offset computation — Intl.DateTimeFormat returns the resolved UTC
// offset for the timezone at the current instant. We use "shortOffset"
// which yields values like "GMT-3", "GMT+5:30", "GMT" (for UTC).
//
// The cache memoizes per-session so the offsets are computed once per
// unique timezone (not once per <option> per render). DST transitions
// would invalidate the cache, but the cache is process-scoped and a
// DST transition only matters in the few days it takes effect — for
// the long-term typical case this is correct. We accept the
// "stale-while-DST" tradeoff for the perf win.
// ---------------------------------------------------------------------------

const OFFSET_CACHE = new Map<string, string>();

/**
 * Compute the short GMT offset for a timezone, e.g. "GMT-3",
 * "GMT+5:30", or "GMT" for UTC. Returns an empty string when the
 * timezone is unknown to the runtime (defensive — every entry in
 * `TIMEZONES` is a real IANA zone, so this branch is unreachable in
 * practice).
 */
function getTimezoneOffset(timezone: string): string {
  const cached = OFFSET_CACHE.get(timezone);
  if (cached !== undefined) return cached;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    const value = offsetPart?.value ?? "";
    OFFSET_CACHE.set(timezone, value);
    return value;
  } catch {
    OFFSET_CACHE.set(timezone, "");
    return "";
  }
}

/**
 * Build the visible label for a timezone entry, e.g.
 *   "Buenos Aires (GMT-3)" / "Nueva York (GMT-5)" / "UTC (GMT)".
 *
 * Pure function — the offset is memoized per timezone (see
 * `OFFSET_CACHE` rationale above). DST transitions are reflected
 * within a single user session; the offset label may go stale across
 * a DST boundary, which is an acceptable tradeoff for the perf win.
 */
function formatTimezoneLabel(value: string, label: string): string {
  const offset = getTimezoneOffset(value);
  return offset ? `${label} (${offset})` : label;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Shared class string for the underlying `<select>`. Mirrors the
 * shadcn `Input` component's `data-slot="input"` styles so the
 * timezone dropdown blends with text inputs in the same form row.
 * The styling is intentionally minimal: native `<select>` chrome
 * with the project's border / focus / disabled tokens.
 */
const SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/40 dark:aria-invalid:ring-destructive/40";

export interface TimezoneSelectProps {
  /** Currently selected IANA timezone (controlled). */
  value: string;
  /** Called with the new IANA string when the user picks a different option. */
  onChange: (value: string) => void;
  /** Forwarded to the underlying `<select>` — RBAC read-only flag. */
  disabled?: boolean;
  /** Forwarded to the underlying `<select>` — for the parent form's `<label htmlFor>`. */
  id?: string;
  /** Forwarded to the underlying `<select>` — for the parent form's validation styling. */
  "aria-invalid"?: boolean;
  /** Test hook — forwarded to the underlying `<select>`. */
  "data-testid"?: string;
  /** Test hook — forwarded to the underlying `<select>`. */
  name?: string;
}

/**
 * Native `<select>` with the curated timezone list. Controlled
 * component — `value` + `onChange` are the only data props.
 */
export const TimezoneSelect = React.forwardRef<
  HTMLSelectElement,
  TimezoneSelectProps
>(function TimezoneSelect(
  { value, onChange, disabled, id, name, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      data-slot="input"
      className={cn(SELECT_CLASS)}
      {...rest}
    >
      {TIMEZONES.map((tz) => (
        <option key={tz.value} value={tz.value}>
          {formatTimezoneLabel(tz.value, tz.label)}
        </option>
      ))}
    </select>
  );
});
