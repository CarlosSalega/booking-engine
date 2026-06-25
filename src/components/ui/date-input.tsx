"use client";

/**
 * `DateInput` — a date picker with a calendar popover for Argentinian
 * date format (DD/MM/YYYY).
 *
 * Internally stores/emits `YYYY-MM-DD` (ISO 8601 date-only, compatible
 * with URL searchParams and Prisma). Displays `DD/MM/YYYY` in the
 * input so the user sees the local format. The calendar popover uses
 * react-day-picker via the shadcn Calendar component.
 *
 * Why not `<input type="date">`: the native widget renders in the
 * browser/OS locale — labels and format are uncontrollable from
 * HTML/CSS. In an English OS, the picker shows "MM/DD/YYYY" and
 * English month names.
 */

import { useState, useCallback } from "react";
import { es } from "react-day-picker/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

/** Convert ISO (YYYY-MM-DD) → display (DD/MM/YYYY). */
function isoToDisplay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Convert display (DD/MM/YYYY) → ISO (YYYY-MM-DD). */
function displayToIso(display: string): string {
  const trimmed = display.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return trimmed;
  const d = match[1].padStart(2, "0");
  const m = match[2].padStart(2, "0");
  let y = match[3];
  if (y.length === 2) y = `20${y}`;
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  if (month < 1 || month > 12) return trimmed;
  if (day < 1 || day > 31) return trimmed;
  return `${y}-${m}-${d}`;
}

/** Parse ISO string to a Date for the calendar. */
function isoToDate(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  // Use local midnight so the calendar highlights the right day
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface DateInputProps {
  /** ISO date value (YYYY-MM-DD) or empty string. */
  value: string;
  /** Called with the ISO date when the user picks or types a date. */
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
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(() => isoToDisplay(value));

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplay(raw);
      const iso = displayToIso(raw);
      if (iso !== raw || raw === "") {
        onChange(iso);
      }
    },
    [onChange],
  );

  const handleInputBlur = useCallback(() => {
    const iso = displayToIso(display);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      setDisplay(isoToDisplay(iso));
      onChange(iso);
    }
  }, [display, onChange]);

  const handleCalendarSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      setDisplay(isoToDisplay(iso));
      onChange(iso);
      setOpen(false);
    },
    [onChange],
  );

  // Sync from external value changes (e.g. URL param change, clear filters)
  const externalDisplay = isoToDisplay(value);
  if (externalDisplay !== display && !open) {
    setDisplay(externalDisplay);
  }

  const selected = isoToDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            id={id}
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className={cn("pr-8", className)}
            aria-label="Fecha en formato día/mes/año"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
            tabIndex={-1}
            aria-label="Abrir calendario"
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleCalendarSelect}
          locale={es}
          weekStartsOn={1}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}
