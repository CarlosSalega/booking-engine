"use client";

/**
 * `DateInput` — a controlled text input for Argentinian date format.
 *
 * Internally stores/emits `YYYY-MM-DD` (ISO 8601 date-only,
 * compatible with URL searchParams and Prisma). Displays
 * `DD/MM/YYYY` so the user sees the local format. Accepts typing,
 * pasting, and blur-based normalization.
 *
 * Why not `<input type="date">`: the native widget renders in the
 * browser/OS locale — labels and format are uncontrollable from
 * HTML/CSS. In an English OS, the picker shows "MM/DD/YYYY" and
 * English month names, which is wrong for Argentinian users.
 */

import { useState, useCallback } from "react";

import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

/**
 * Convert ISO (YYYY-MM-DD) → display (DD/MM/YYYY).
 * Returns empty string when the input is empty or malformed.
 */
function isoToDisplay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Convert display (DD/MM/YYYY) → ISO (YYYY-MM-DD).
 * Returns the original string when it can't be parsed so the
 * consumer can decide to ignore it.
 */
function displayToIso(display: string): string {
  const trimmed = display.trim();
  if (!trimmed) return "";
  // Allow loose typing: 1/1/26 → 01/01/2026
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return trimmed; // not parseable yet
  const d = match[1].padStart(2, "0");
  const m = match[2].padStart(2, "0");
  let y = match[3];
  if (y.length === 2) y = `20${y}`;
  // Basic sanity checks
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  if (month < 1 || month > 12) return trimmed;
  if (day < 1 || day > 31) return trimmed;
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface DateInputProps {
  /** ISO date value (YYYY-MM-DD) or empty string. */
  value: string;
  /** Called with the ISO date when the user changes the value. */
  onChange: (iso: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
}

export function DateInput({
  value,
  onChange,
  id,
  className,
  placeholder = "DD/MM/AAAA",
}: DateInputProps) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplay(raw);
      const iso = displayToIso(raw);
      // Only emit when we have a valid date or the field was cleared
      if (iso !== raw || raw === "") {
        onChange(iso);
      }
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    // Normalize the display to DD/MM/YYYY on blur
    const iso = displayToIso(display);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      setDisplay(isoToDisplay(iso));
      onChange(iso);
    }
  }, [display, onChange]);

  // Sync external value changes
  const externalDisplay = isoToDisplay(value);
  if (externalDisplay !== display && document.activeElement?.id !== id) {
    setDisplay(externalDisplay);
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      aria-label="Fecha en formato día/mes/año"
    />
  );
}
