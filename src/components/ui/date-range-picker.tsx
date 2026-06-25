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
import { useMediaQuery } from "@/hooks/use-media-query"

interface DateRangePickerProps {
  /** ISO date value (YYYY-MM-DD) or empty string. */
  from: string
  /** ISO date value (YYYY-MM-DD) or empty string. */
  to: string
  /** Called when the range is committed (both dates selected or cleared). */
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
  const fromDate = React.useMemo(() => parseDate(from), [from])
  const toDate = React.useMemo(() => parseDate(to), [to])

  const isDesktop = useMediaQuery("(min-width: 640px)")

  // --- Local buffer for in-progress selection ---
  // We buffer the selection locally while the user is picking dates.
  // The URL is only updated when the range is complete (both dates)
  // or explicitly cleared. This prevents router.push from closing
  // the popover mid-selection.

  const [pendingFrom, setPendingFrom] = React.useState<Date | undefined>(undefined)
  const [pendingTo, setPendingTo] = React.useState<Date | undefined>(undefined)

  // When the popover opens, initialise the buffer from the URL values
  // so the previously-committed range is visible immediately.
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        // Initialise buffer from committed URL values
        setPendingFrom(fromDate)
        setPendingTo(toDate)
      } else {
        // Discard partial selection — user closed without completing
        setPendingFrom(undefined)
        setPendingTo(undefined)
      }
    },
    [fromDate, toDate],
  )

  // The value shown in the calendar: use pending buffer while
  // selecting, fall back to URL values.
  const displayRange = React.useMemo(() => {
    const f = pendingFrom ?? fromDate
    const t = pendingTo ?? toDate
    return f || t ? { from: f, to: t } : undefined
  }, [pendingFrom, pendingTo, fromDate, toDate])

  const handleSelect = React.useCallback(
    (range: { from?: Date; to?: Date } | undefined) => {
      if (!range) {
        setPendingFrom(undefined)
        setPendingTo(undefined)
        onChange({ from: "", to: "" })
        return
      }

      setPendingFrom(range.from)
      setPendingTo(range.to)

      // Only commit to URL when the range is complete
      if (range.from && range.to) {
        onChange({
          from: formatISO(range.from),
          to: formatISO(range.to),
        })
      }
    },
    [onChange],
  )

  const label = fromDate && toDate
    ? `${format(fromDate, "dd/MM/yy", { locale: es })} – ${format(toDate, "dd/MM/yy", { locale: es })}`
    : fromDate
      ? `Desde ${format(fromDate, "dd/MM/yy", { locale: es })}`
      : "Seleccionar fechas"

  return (
    <Popover onOpenChange={handleOpenChange}>
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
          selected={displayRange}
          onSelect={handleSelect}
          locale={es}
          weekStartsOn={1}
          numberOfMonths={isDesktop ? 2 : 1}
          showOutsideDays={true}
          fixedWeeks
        />
      </PopoverContent>
    </Popover>
  )
}
