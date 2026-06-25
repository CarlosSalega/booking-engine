"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  /** ISO date value (YYYY-MM-DD) or empty string. */
  value: string
  /** Called with the ISO date when the user picks a date. */
  onChange: (iso: string) => void
  className?: string
  placeholder?: string
}

/**
 * Parse an ISO date string (YYYY-MM-DD) into a Date object.
 * Returns undefined for empty or malformed input.
 */
function parseDate(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Format a Date into an ISO date string (YYYY-MM-DD).
 */
function formatISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "Seleccionar fecha",
}: DatePickerProps) {
  const date = parseDate(value)

  function handleSelect(selected: Date | undefined) {
    if (selected) {
      onChange(formatISO(selected))
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {date ? (
            format(date, "PPP", { locale: es })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={es}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  )
}
