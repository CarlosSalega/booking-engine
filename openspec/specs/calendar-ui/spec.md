# Calendar UI Specification

## Purpose

Wrapper over `react-day-picker` v10 `DayPicker` with CSS variable theming, range-mode classNames, DayFlag styling hooks, and lucide-react chevron navigation. `"use client"` component — must run on the browser for CSS variable and style-prop support.

## Requirements

### Requirement: RDP v10 DayPicker Integration

The Calendar component SHALL render `DayPicker` from `react-day-picker` v10 and accept all native `React.ComponentProps<typeof DayPicker>`.

- **className forwarding**: Accepts `className` and merges it with `"p-3"` via `cn()` before passing to `DayPicker`.
- **showOutsideDays**: Accepts `showOutsideDays` (default `true`), passed through to `DayPicker`.
- **Spread props**: ALL remaining props (`...props`) forwarded to `DayPicker` — supports `mode`, `selected`, `onSelect`, `locale`, `weekStartsOn`, `numberOfMonths`, `fixedWeeks`, etc.

#### Scenario: Renders DayPicker with forwarded props
- GIVEN `<Calendar mode="range" selected={range} locale={es} />`
- WHEN component mounts
- THEN `DayPicker` renders with passed `mode`, `selected`, `locale` values

#### Scenario: className merged with default
- GIVEN `<Calendar className="my-custom" />`
- WHEN `DayPicker` renders
- THEN className is `"p-3 my-custom"` (base + forwarded)

### Requirement: CSS Variable Theming via style Prop

The Calendar component SHALL inject CSS custom properties through the `DayPicker` `style` prop to control react-day-picker's internal layout and color tokens.

All `--rdp-*` color variables MUST reference design token values directly via `var(--token-name)` without wrapping in `hsl()`. Since the project's design tokens are authored in `oklch()`, wrapping them in `hsl()` produces invalid CSS (e.g. `hsl(oklch(...))` is dropped by the browser).

| Variable | Value | Purpose |
|----------|-------|---------|
| `--rdp-day-width` | `2rem` | Uniform day cell width |
| `--rdp-day-height` | `2rem` | Uniform day cell height |
| `--rdp-day_button-width` | `2rem` | Button inside day cell |
| `--rdp-day_button-height` | `2rem` | Button inside day cell |
| `--rdp-months-gap` | `3rem` | Gap between months in multi-month |
| `--rdp-accent-color` | `var(--primary)` | Selected day background (maps to global --primary) |
| `--rdp-accent-background-color` | `var(--primary) / 0.15` or `color-mix(in oklch, var(--primary) 15%, transparent)` | Range middle background |
| `--rdp-range_start-date-background-color` | `var(--primary)` | Range start day background |
| `--rdp-range_end-date-background-color` | `var(--primary)` | Range end day background |
| `--rdp-range_start-color` | `var(--primary-foreground)` | Range start text color |
| `--rdp-range_end-color` | `var(--primary-foreground)` | Range end text color |

The corresponding test file (`src/components/ui/__tests__/calendar.test.tsx`) MUST assert the corrected `var(--primary)` value, not the previous broken `hsl(var(--primary))` value.

(Previously: `--rdp-accent-color` and related color variables used `hsl(var(--primary))`, which is invalid CSS because `--primary` is defined in `oklch()`. The `hsl(oklch(...))` declaration was dropped by the browser, causing the calendar's selected/range styling to fall back to defaults. The test file also asserted the broken value.)

#### Scenario: Accent color maps to theme primary via valid CSS
- GIVEN `--primary` defined in `globals.css` as an `oklch()` value
- WHEN Calendar renders
- THEN `--rdp-accent-color` is set to `var(--primary)` (not `hsl(var(--primary))`)
- AND the selected day shows the primary color background correctly in the browser

#### Scenario: Range middle background uses valid token reference
- GIVEN Calendar with `mode="range"` and a multi-day selection
- WHEN the range middle days render
- THEN `--rdp-accent-background-color` references `var(--primary)` with opacity (not wrapped in `hsl()`)
- AND the range middle background is visible and matches the primary color at reduced opacity

#### Scenario: Range start/end colors use valid references
- GIVEN Calendar with `mode="range"` and a complete selection
- WHEN the range start and end days render
- THEN `--rdp-range_start-date-background-color` is `var(--primary)` (not `hsl(var(--primary))`)
- AND `--rdp-range_start-color` is `var(--primary-foreground)` (not `hsl(var(--primary-foreground))`)

#### Scenario: Months gap applied at 3rem
- GIVEN Calendar with 2 months visible
- WHEN DayPicker renders
- THEN gap between months is 3rem via `--rdp-months-gap`

#### Scenario: Test assertions match corrected values
- GIVEN the `calendar.test.tsx` test file
- WHEN the test for accent color runs
- THEN it asserts `var(--primary)` (not `hsl(var(--primary))`)
- AND the test passes with the corrected implementation
### Requirement: navLayout and Chevron Navigation

The Calendar SHALL support `navLayout` prop (default `"around"`) and SHALL render lucide-react `ChevronLeft`/`ChevronRight` icons as custom chevron components.

- **navLayout prop**: Typed as `"around" | "after" | undefined`, forwarded to `DayPicker.navLayout`.
- **Chevron components**: `DayPicker.components.Chevron` renders `ChevronLeft` (orientation=left) or `ChevronRight` (orientation=right), both with `size-4`.
- **Nav button styling**: Previous/Next month buttons styled with `buttonVariants({ variant: "outline" })`, `size-7`, absolute positioning at caption sides, `opacity-50` default, `opacity-100` on hover.

#### Scenario: navLayout=around renders arrows at caption sides
- GIVEN `<Calendar navLayout="around" />`
- WHEN DayPicker renders month
- THEN left arrow positioned at caption left, right arrow at caption right

#### Scenario: Chevrons use lucide icons
- GIVEN Calendar renders month navigation
- WHEN nav buttons rendered
- THEN each contains lucide `ChevronLeft`/`ChevronRight` component at `size-4`

### Requirement: DayFlag Styling

The Calendar SHALL apply styles via react-day-picker v10 `DayFlag` enumeration for outside, today, and disabled states.

| DayFlag | Style | Behavior |
|---------|-------|----------|
| `DayFlag.outside` | `opacity-[0.15]` | Days from adjacent months are dimmed |
| `DayFlag.today` | `font-semibold` | Current day has bolder text |
| `DayFlag.disabled` | `opacity-50` | Disabled days appear half-opaque |

#### Scenario: Outside days dimmed via opacity
- GIVEN month grid with adjacent month days visible
- WHEN Calendar renders
- THEN outside days have `opacity-[0.15]` applied via `DayFlag.outside`

#### Scenario: Today highlighted with semibold
- GIVEN today is June 26
- WHEN Calendar renders June
- THEN day 26 has `font-semibold` via `DayFlag.today`

### Requirement: Range Mode Styling

When `mode="range"`, the Calendar SHALL apply rounded corners to range start and end days using CSS `:has()` selectors.

```css
[&:has(.rdp-range_start)]:rounded-l-md
[&:has(.rdp-range_end)]:rounded-r-md
```

Range start/end background and text colors are handled by CSS variables (`--rdp-range_start-date-background-color`, `--rdp-range_end-color`, etc.) — no Tailwind color overrides in classNames.

#### Scenario: Range start has left rounded corners
- GIVEN Calendar with `mode="range"` and user selects first date
- WHEN selected day renders with `.rdp-range_start` class
- THEN day cell has `rounded-l-md` via `:has()` selector

#### Scenario: Range end has right rounded corners
- GIVEN Calendar with `mode="range"` and user completes selection
- WHEN end day renders with `.rdp-range_end` class
- THEN day cell has `rounded-r-md` via `:has()` selector

### Requirement: Day Button Hover States

Day buttons SHALL apply hover background and text color using Tailwind utilities rather than CSS variables.

```css
hover:bg-primary-hover hover:text-muted
```

- **Background**: `hover:bg-primary-hover` — uses `--primary-hover` CSS variable defined in `globals.css`.
- **Text**: `hover:text-muted` — `--muted` color on hover.

#### Scenario: Day button shows hover background
- GIVEN user hovers over a day button
- WHEN pointer enters the button
- THEN background changes to `--primary-hover` color, text changes to `--muted`

### Requirement: Client Component Boundary

The Calendar component MUST be declared `"use client"` because it uses:
- CSS custom properties via `style` prop (must run in browser)
- `DayFlag` enum (runtime reference)
- `UI` enum for classNames keys (runtime reference)
- shadcn `buttonVariants` (className resolution)

#### Scenario: Calendar runs on client only
- GIVEN Next.js App Router with Server Components
- WHEN Calendar is imported into a parent
- THEN it renders as client boundary due to `"use client"` directive

### Requirement: classNames Merging

The Calendar SHALL accept `classNames` prop and spread it AFTER its own defalt classNames, allowing parent overrides.

```typescript
classNames={{
  [UI.Root]: "",
  [UI.Months]: "flex flex-col sm:flex-row gap-2",
  // ... all UI slots mapped to Tailwind classes
  ...classNames, // spread LAST — parent overrides win
}}
```

#### Scenario: Parent overrides DayButton style
- GIVEN `<Calendar classNames={{ [UI.DayButton]: "bg-red-500" }} />`
- WHEN DayPicker renders
- THEN `DayButton` has `bg-red-500` instead of default ghost variant
