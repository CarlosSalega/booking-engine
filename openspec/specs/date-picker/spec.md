# DatePicker Specification

## Purpose

Popover-based single date picker built on the `Calendar` UI wrapper. Accepts an ISO date string as input, displays it in `dd/MM/yy` format with es-AR locale, and notifies parent with an ISO string on selection. Supports optional placeholder text when no date is selected.

## Requirements

### Requirement: ISO String Input and Output API

The DatePicker SHALL accept `value` as an ISO date string (`YYYY-MM-DD`) and SHALL call `onChange(iso: string)` with an ISO date string when the user selects a date.

- **Input**: `value` prop — ISO string or empty string.
- **Output**: `onChange` callback — called with `YYYY-MM-DD` on selection.
- **Malformed input**: `parseDate` returns `undefined` for non-matching strings, treated as no selection.
- **No clear action**: Selecting `undefined` in DayPicker does NOT trigger `onChange` — only explicit date selection calls the callback.

#### Scenario: Valid ISO string displays formatted date
- GIVEN `<DatePicker value="2026-03-15" />`
- WHEN component renders
- THEN button shows "15/03/26" in es-AR format

#### Scenario: Empty value shows placeholder
- GIVEN `<DatePicker value="" placeholder="Elegir fecha" />`
- WHEN component renders
- THEN button shows "Elegir fecha" in muted color

#### Scenario: Date selection emits ISO string
- GIVEN popover open, user clicks March 20
- WHEN DayPicker `onSelect` fires with Date
- THEN `onChange("2026-03-20")` called

#### Scenario: Malformed value treated as no selection
- GIVEN `<DatePicker value="invalid" />`
- WHEN `parseDate("invalid")` returns `undefined`
- THEN button shows default placeholder "Seleccionar fecha"

### Requirement: Controlled Value Rendering

The DatePicker SHALL be a fully controlled component — `value` drives the rendered state.

- DayPicker receives `selected={parseDate(value)}`.
- Button label computed from `parseDate(value)` output.
- No internal state beyond what `value` dictates.

#### Scenario: Value change from parent updates display
- GIVEN DatePicker currently showing "15/03/26"
- WHEN parent updates `value` to "2026-04-01"
- THEN button updates to "01/04/26", DayPicker shows April 1 as selected

### Requirement: es-AR Locale Formatting

The DatePicker trigger button SHALL display the selected date as `dd/MM/yy` using `date-fns` `format` with `es` locale (`date-fns/locale/es`).

| State | Button Content |
|-------|---------------|
| Date selected | `format(date, "dd/MM/yy", { locale: es })` → "15/03/26" |
| No date | `<span>{placeholder}</span>` in `text-muted-foreground` |

#### Scenario: Date rendered in Argentinian format
- GIVEN `value="2026-06-26"`
- WHEN button renders
- THEN label is "26/06/26"

### Requirement: Popover Trigger with Calendar Icon

The trigger SHALL be a shadcn `Button` (variant `outline`, `h-8`, `w-full`) with a lucide `CalendarIcon` (size-4, `mr-2`).

- **Button styling**: `justify-start text-left font-normal`.
- **Icon**: `CalendarIcon` with `mr-2 size-4` (no shrink class — icon is small).
- **No-date style**: `text-muted-foreground` when `!date`.
- **PopoverContent**: `w-auto p-0`, `align="start"`.

#### Scenario: Trigger renders icon and date
- GIVEN value "2026-03-15"
- WHEN component renders
- THEN button contains CalendarIcon at left, "15/03/26" in center

### Requirement: Calendar Configuration

The DatePicker SHALL pass the following props to the `Calendar` component:

| Prop | Value | Purpose |
|------|-------|---------|
| `mode` | `"single"` | Single date selection (not range) |
| `selected` | `parseDate(value)` | Controlled selected value |
| `onSelect` | `handleSelect` | Date → ISO string conversion callback |
| `locale` | `es` | Spanish locale for month/day names |
| `weekStartsOn` | `1` | Monday as first day of week |

#### Scenario: Calendar renders in single mode
- GIVEN popover open
- WHEN DayPicker renders
- THEN user can only select one date at a time (no range mode)

#### Scenario: Calendar uses Monday-first week
- GIVEN Calendar renders month grid
- WHEN week header row displayed
- THEN week starts with Lun (Monday), not Dom (Sunday)

### Requirement: Placeholder Support

The DatePicker SHALL accept an optional `placeholder` prop with default value `"Seleccionar fecha"`.

- `placeholder` SHALL be rendered when `value` is empty or `parseDate` returns `undefined`.
- Placeholder SHALL use `text-muted-foreground` color to distinguish from selected date.

#### Scenario: Custom placeholder rendered when empty
- GIVEN `<DatePicker value="" placeholder="Elegir fecha de nacimiento" />`
- WHEN button renders
- THEN "Elegir fecha de nacimiento" displayed in muted color

#### Scenario: Default placeholder when not specified
- GIVEN `<DatePicker value="" />`
- WHEN button renders
- THEN "Seleccionar fecha" displayed in muted color

### Requirement: TypeScript Interface

```typescript
interface DatePickerProps {
  /** ISO date value (YYYY-MM-DD) or empty string. */
  value: string
  /** Called with the ISO date when the user picks a date. */
  onChange: (iso: string) => void
  className?: string
  placeholder?: string
}
```

`className` SHALL be forwarded to the trigger `Button` component.
