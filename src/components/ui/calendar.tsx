"use client"

import * as React from "react"
import { DayPicker, UI, DayFlag } from "react-day-picker"
import "react-day-picker/style.css"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  navLayout = "around",
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  /** @default "around" — places arrows at the sides of the caption. */
  navLayout?: "around" | "after" | undefined
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout={navLayout}
      className={cn("p-3", className)}
      style={
        {
          "--rdp-day-width": "2rem",
          "--rdp-day-height": "2rem",
          "--rdp-day_button-width": "2rem",
          "--rdp-day_button-height": "2rem",
          "--rdp-months-gap": "3rem",
          // Theme accent — maps to globals.css --primary. The variables
          // are authored as oklch(), so wrapping them in hsl() would
          // produce invalid CSS (hsl(oklch(...))) that the browser
          // drops. Bare `var(--*)` references + `color-mix` for the
          // translucent range middle keep the value theme-reactive.
          "--rdp-accent-color": "var(--primary)",
          "--rdp-accent-background-color":
            "color-mix(in oklch, var(--primary) 15%, transparent)",
          "--rdp-range_start-date-background-color": "var(--primary)",
          "--rdp-range_end-date-background-color": "var(--primary)",
          "--rdp-range_start-color": "var(--primary-foreground)",
          "--rdp-range_end-color": "var(--primary-foreground)",
          "--rdp-today-color": "var(--primary)",
        } as React.CSSProperties
      }
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
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-0 top-0 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-0 top-0 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        [UI.MonthGrid]: "w-full border-collapse space-y-1",
        [UI.Weekdays]: "flex",
        [UI.Weekday]:
          "text-muted-foreground w-8 font-normal text-[0.8rem] text-center [padding:0.25rem_0]",
        [UI.Week]: "flex w-full mt-1",
        [UI.Day]: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range" && [
            "[&:has(.rdp-range_start)]:rounded-l-md",
            "[&:has(.rdp-range_end)]:rounded-r-md",
          ],
        ),
        [UI.DayButton]: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal",
          "hover:bg-primary-hover hover:text-muted",
        ),
        [UI.WeekNumber]: "text-xs text-muted-foreground",
        // Day flags — appended to Day element when the flag is active
        [DayFlag.outside]: "opacity-[0.15]",
        [DayFlag.today]: "font-semibold",
        [DayFlag.disabled]: "opacity-50",
        ...classNames,
      }}
      {...props}
    />
  )
}

export { Calendar }
