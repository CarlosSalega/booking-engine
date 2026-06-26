# DateRangePicker Specification

## Purpose

Popover-based date range selection component built on the `Calendar` UI wrapper. Accepts ISO date strings as input, manages local buffer state to prevent premature popover closure, and notifies parent only when a complete range (from + to) is selected. Responsive months: 2 on desktop, 1 on mobile. es-AR locale formatting.

## Requirements

### Requirement: ISO String Input API

The DateRangePicker SHALL accept `from` and `to` as ISO date strings (`YYYY-MM-DD`) and SHALL parse them internally to `Date` objects for the `DayPicker` `selected` prop.

- `from` / `to` props: ISO strings or empty string (no selection).
- Malformed input (not matching `/^\d{4}-\d{2}-\d{2}$/`): returns `undefined` from `parseDate`, treated as no selection.
- **Displayed range fallback**: `localFrom ?? fromDate` and `localTo ?? toDate` — local buffer takes priority during in-progress selection, falls back to URL/parent values.

#### Scenario: Receives valid ISO range and displays it
- GIVEN `<DateRangePicker from="2026-03-15" to="2026-03-20" />`
- WHEN component mounts
- THEN trigger button label displays "15/03/26 – 20/03/26" in es-AR format

#### Scenario: Empty strings treated as no selection
- GIVEN `<DateRangePicker from="" to="" />`
- WHEN component mounts
- THEN trigger button shows placeholder "Seleccionar fechas" in muted color

#### Scenario: Malformed ISO ignored
- GIVEN `<DateRangePicker from="not-a-date" />`
- WHEN `parseDate` returns `undefined`
- THEN trigger button shows placeholder, no date visible

### Requirement: ISO String Output API

When a complete range is selected, the DateRangePicker SHALL call `onChange({ from: string, to: string })` with ISO-formatted date strings.

- **On completion**: both `from` and `to` selected → `onChange` called with ISO strings.
- **On clear**: range is `undefined` → `onChange({ from: "", to: "" })`.
- **Format**: `YYYY-MM-DD` (zero-padded), matching `from`/`to` input format.

#### Scenario: Complete range emits ISO strings
- GIVEN user selects March 15 as start
- WHEN user then selects March 20 as end
- THEN `onChange({ from: "2026-03-15", to: "2026-03-20" })` called

#### Scenario: Clear selection emits empty strings
- GIVEN range is partially selected
- WHEN user clears selection (undefined range from DayPicker)
- THEN `onChange({ from: "", to: "" })` called

### Requirement: Local Buffer State for Controlled Popover

The DateRangePicker SHALL maintain internal `localFrom`/`localTo` state that acts as a buffer during in-progress range selection, preventing the popover from closing on the first click.

| State | Type | Purpose |
|-------|------|---------|
| `localFrom` | `Date \| undefined` | Start of in-progress range (not yet committed to parent) |
| `localTo` | `Date \| undefined` | End of in-progress range (not yet committed to parent) |
| `displayRange` | `{ from?, to? } \| undefined` | Computed: `{ from: localFrom ?? fromDate, to: localTo ?? toDate }` |

- **Popover stays open**: DayPicker receives buffered range via `selected={displayRange}` — visual state preserved while user picks both dates.
- **Buffer cleared on commit**: When `range.from && range.to` are both set, `onChange` fires and buffer resets to `undefined`.
- **Fallback on refresh**: `displayRange` falls back to `fromDate`/`toDate` via `??` when buffer is empty — persists URL state on re-render.

#### Scenario: First click updates local buffer without closing popover
- GIVEN popover is open, no range selected
- WHEN user clicks March 15 (first date)
- THEN `localFrom` set to March 15, `localTo` is undefined, popover stays open

#### Scenario: Second click commits range and closes popover
- GIVEN `localFrom` = March 15, popover open
- WHEN user clicks March 20 (second date)
- THEN `onChange({ from: "2026-03-15", to: "2026-03-20" })` called, local buffer cleared, popover closes (via DayPicker default behavior)

#### Scenario: Buffer falls back to parent values on state reset
- GIVEN parent sets `from="2026-04-01"`, `to="2026-04-05"`, buffer is `undefined`
- WHEN `displayRange` computed
- THEN `displayRange = { from: Date("2026-04-01"), to: Date("2026-04-05") }`

### Requirement: Memoized Callback

The `handleSelect` callback SHALL be wrapped in `useCallback` with `[onChange]` dependency array to prevent unnecessary re-renders of the underlying `DayPicker`.

#### Scenario: Callback reference stable across renders
- GIVEN parent's `onChange` reference does not change
- WHEN DateRangePicker re-renders
- THEN `handleSelect` reference is stable (same across renders)

### Requirement: Responsive Months (Airbnb-Style UX)

The DateRangePicker SHALL display 2 months on viewports ≥640px and 1 month on smaller screens.

- **Desktop**: `numberOfMonths={2}` via `useMediaQuery("(min-width: 640px)")`.
- **Mobile**: `numberOfMonths={1}`.
- **Outside days**: `showOutsideDays={true}` — outside days rendered but dimmed via `opacity-[0.15]` in Calendar's DayFlag styling.
- **Fixed weeks**: `fixedWeeks` prop enabled — ensures consistent month height.
- **navLayout**: Delegated to Calendar default (`"around"`).
- **Week start**: Monday (`weekStartsOn={1}`).

#### Scenario: Desktop shows two months side by side
- GIVEN viewport width ≥640px
- WHEN popover opens
- THEN 2 months displayed, 3rem gap between them

#### Scenario: Mobile shows single month
- GIVEN viewport width 375px
- WHEN popover opens
- THEN single month displayed

### Requirement: es-AR Locale Formatting

The DateRangePicker SHALL format trigger button text using `date-fns` `format` with `es` locale (`date-fns/locale`).

| State | Format | Example |
|-------|--------|---------|
| Both dates selected | `dd/MM/yy` – `dd/MM/yy` | "15/03/26 – 20/03/26" |
| Only `from` selected | `Desde dd/MM/yy` | "Desde 15/03/26" |
| No selection | Placeholder text | "Seleccionar fechas" |

- **Locale**: `date-fns/locale/es` — Spanish month abbreviations and ordinal rules.
- **Placeholder color**: `text-muted-foreground` when no date selected.

#### Scenario: Full range displayed with em dash
- GIVEN `from="2026-03-15"`, `to="2026-03-20"`
- WHEN trigger button renders
- THEN label is "15/03/26 – 20/03/26" in normal font weight

#### Scenario: Single date shows "Desde" prefix
- GIVEN `from="2026-06-01"`, `to=""`
- WHEN trigger button renders
- THEN label is "Desde 01/06/26"

#### Scenario: No selection shows placeholder
- GIVEN `from=""`, `to=""`
- WHEN trigger button renders
- THEN "Seleccionar fechas" in muted color

### Requirement: Popover Trigger with Calendar Icon

The trigger SHALL be a shadcn `Button` (variant `outline`, `size` default) with a lucide `CalendarIcon` (size-4, `mr-2`) and truncated text.

- **Button width**: `w-full justify-start text-left font-normal`.
- **Height**: `h-8` (compact form-field height).
- **Icon**: `CalendarIcon` with `mr-2 size-4 shrink-0`.
- **Popover alignment**: `align="start"` on PopoverContent.

#### Scenario: Trigger renders calendar icon and label
- GIVEN range "15/03/26 – 20/03/26"
- WHEN component renders
- THEN button shows calendar icon at left, "15/03/26 – 20/03/26" truncated in center

### Requirement: TypeScript Interface

```typescript
interface DateRangePickerProps {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
  className?: string
}
```

`className` SHALL be forwarded to the trigger `Button` component.
