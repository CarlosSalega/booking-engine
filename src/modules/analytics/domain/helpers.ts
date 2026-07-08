/**
 * Analytics domain — helper functions.
 *
 * Pure functions for date boundary computation and metric formatting.
 * No side effects, no external dependencies beyond date-fns.
 *
 * Spec source: openspec/changes/analytics/specs/analytics-domain/spec.md
 * — AND-004 (timezone-aware helpers), AND-005 (empty/null handling).
 */

import { subDays } from "date-fns";

import type { DateRange } from "./types";
import { DATE_RANGE_PRESETS } from "./constants";

// ---------------------------------------------------------------------------
// getDateBoundaries — AND-004: UTC boundary timestamps from preset + timezone.
// ---------------------------------------------------------------------------

interface DateBoundaries {
  from: Date;
  to: Date;
}

/**
 * Computes UTC boundary timestamps for a date range in the given timezone.
 *
 * For preset ranges, `from` is start-of-day N days ago and `to` is end-of-day
 * today, both expressed in the org's timezone then converted to UTC.
 *
 * For custom ranges, from/to are passed through directly.
 *
 * @param range - The date range (preset or custom).
 * @param timezone - IANA timezone string (e.g., "America/Argentina/Buenos_Aires").
 * @returns `{ from, to }` as UTC Date objects.
 */
export function getDateBoundaries(
  range: DateRange,
  timezone: string,
): DateBoundaries {
  if (range.preset === "custom") {
    return { from: range.from, to: range.to };
  }

  const presetConfig = DATE_RANGE_PRESETS[range.preset];
  const now = new Date();

  // Compute the target date N days ago in the given timezone.
  const targetDate = subDays(now, presetConfig.days);

  // Get start-of-day and end-of-day in the org timezone.
  // We use Intl.DateTimeFormat to get the local date parts, then construct
  // UTC dates that represent the same wall-clock time in the target timezone.
  const from = getStartOfDayInTimezone(targetDate, timezone);
  const to = getEndOfDayInTimezone(now, timezone);

  return { from, to };
}

/**
 * Gets the start of day (00:00:00.000) for a given date in a timezone,
 * returned as a UTC Date.
 */
function getStartOfDayInTimezone(date: Date, timezone: string): Date {
  // Get the date parts in the target timezone.
  const parts = getDatePartsInTimezone(date, timezone);

  // Construct a UTC Date representing midnight on this date.
  // We use Date.UTC to avoid system timezone interpretation.
  const midnightUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);

  // Get the UTC offset for this timezone at midnight.
  const offsetMs = getTimezoneOffsetMs(new Date(midnightUtc), timezone);

  // Convert: the local midnight expressed as UTC = midnightUtc - offset.
  return new Date(midnightUtc - offsetMs);
}

/**
 * Gets the end of day (23:59:59.999) for a given date in a timezone,
 * returned as a UTC Date.
 */
function getEndOfDayInTimezone(date: Date, timezone: string): Date {
  const parts = getDatePartsInTimezone(date, timezone);

  // Compute offset at midnight (consistent with getStartOfDayInTimezone).
  const midnightUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
  const offsetMs = getTimezoneOffsetMs(new Date(midnightUtc), timezone);

  // End of day in local time, expressed as UTC.
  const endOfDayLocal = Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999);

  return new Date(endOfDayLocal - offsetMs);
}

/**
 * Extracts year, month, day from a Date in the given timezone.
 */
function getDatePartsInTimezone(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return { year, month, day };
}

/**
 * Computes the UTC offset in milliseconds for a given timezone at a given time.
 * Positive = timezone is ahead of UTC (e.g., UTC+2 returns positive).
 * Argentina UTC-3 returns negative (-10800000).
 *
 * Uses Intl.DateTimeFormat formatToParts for reliable extraction.
 */
function getTimezoneOffsetMs(date: Date, timezone: string): number {
  // Create a formatter that includes the time zone offset.
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  // The formatted parts represent the wall-clock time in the target timezone.
  // We reconstruct it as a UTC timestamp.
  const tzYear = getPart("year");
  const tzMonth = getPart("month") - 1; // 0-indexed
  const tzDay = getPart("day");
  let tzHour = getPart("hour");
  const tzMinute = getPart("minute");
  const tzSecond = getPart("second");

  // Intl uses "24" for midnight in some locales.
  if (tzHour === 24) tzHour = 0;

  // The original date in UTC.
  const utcMs = date.getTime();

  // The wall-clock time in the target timezone, interpreted as UTC.
  const tzAsUtc = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond);

  // offset = tzAsUtc - utcMs
  // If the timezone is ahead of UTC, tzAsUtc > utcMs → positive offset.
  return tzAsUtc - utcMs;
}

// ---------------------------------------------------------------------------
// formatMetricValue — human-readable metric display.
// ---------------------------------------------------------------------------

export type MetricFormatType = "number" | "currency" | "percentage";

const LOCALE = "es-AR";

/**
 * Formats a metric value for display.
 *
 * @param value - The numeric value to format.
 * @param type - The format type: "number", "currency", or "percentage".
 * @returns Formatted string in Argentine locale.
 */
export function formatMetricValue(
  value: number,
  type: MetricFormatType,
): string {
  switch (type) {
    case "number":
      return new Intl.NumberFormat(LOCALE).format(value);

    case "currency":
      return new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: "ARS",
      }).format(value);

    case "percentage":
      return new Intl.NumberFormat(LOCALE, {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(value);

    default: {
      const _exhaustive: never = type;
      return String(_exhaustive);
    }
  }
}
