"use client"

import * as React from "react"
import { DayPicker, UI } from "react-day-picker"
import "react-day-picker/style.css"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      components={{
        Chevron: ({ orientation, ...chevronProps }) => {
          if (orientation === "left") {
            return <ChevronLeft className="size-4" {...chevronProps  as Record<string, unknown>} />
          }
          return <ChevronRight className="size-4" {...chevronProps  as Record<string, unknown>} />
        },
      }}
      classNames={{
        [UI.Root]: "",
        [UI.Months]: "flex flex-col sm:flex-row gap-2",
        [UI.Month]: "flex flex-col gap-4",
        [UI.MonthCaption]: "flex justify-center items-center pt-1 relative h-8",
        [UI.CaptionLabel]: "text-sm font-medium",
        [UI.Nav]: "flex items-center gap-1 absolute",
        [UI.Chevron]: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        [UI.MonthGrid]: "w-full border-collapse space-y-1",
        [UI.Weekdays]: "flex",
        [UI.Weekday]:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        [UI.Week]: "flex w-full mt-1",
        [UI.Day]: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has([aria-selected])]:bg-accent [&:has(.rdp-range_end)]:rounded-r-md [&:has(.rdp-range_start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        [UI.DayButton]: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100",
        ),
        // Selection states are applied as additional classes via the
        // SelectionState enum, not as UI elements.
        [UI.WeekNumber]: "text-xs text-muted-foreground w-8",
        ...classNames,
      }}
      {...props}
    />
  )
}

export { Calendar }
