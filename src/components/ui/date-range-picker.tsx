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

interface DateRangePickerProps {
  /** ISO date value (YYYY-MM-DD) or empty string. */
  from: string
  /** ISO date value (YYYY-MM-DD) or empty string. */
  to: string
  /** Called with { from, to } ISO strings when the user picks a range. */
  onChange: (range: { from: string; to: string }) => void
  className?: string
}

function parseDate(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function formatISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function DateRangePicker({
  from,
  to,
  onChange,
  className,
}: DateRangePickerProps) {
  const fromDate = parseDate(from)
  const toDate = parseDate(to)

  const selected = fromDate || toDate
    ? { from: fromDate, to: toDate }
    : undefined

  function handleSelect(range: { from?: Date; to?: Date } | undefined) {
    if (range?.from && range?.to) {
      onChange({
        from: formatISO(range.from),
        to: formatISO(range.to),
      })
    } else if (range?.from && !range?.to) {
      // User picked the first date — emit partial so the URL updates
      // optimistically (only dateFrom is set until the second click)
      onChange({
        from: formatISO(range.from),
        to: "",
      })
    } else {
      // Cleared
      onChange({ from: "", to: "" })
    }
  }

  const label = fromDate && toDate
    ? `${format(fromDate, "dd/MM/yy", { locale: es })} – ${format(toDate, "dd/MM/yy", { locale: es })}`
    : fromDate
      ? `Desde ${format(fromDate, "dd/MM/yy", { locale: es })}`
      : "Seleccionar fechas"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full justify-start text-left font-normal",
            !fromDate && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          locale={es}
          weekStartsOn={1}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
