# Calendar View Specification

## Purpose

Interactive calendar (week/day/month) over existing bookings. Server Component resolves org/session/RBAC, passes data to client. Status-colored events with click-to-action popover gated by `canTransition`. es-AR locale.

## Requirements

### Requirement: Calendar Page and RBAC Scoping

Server Component at `/dashboard/calendar`. MUST resolve org, session, role. RBAC: ADMIN/SECRETARY see all; PROFESSIONAL sees own only. Filter dropdown visible for ADMIN/SECRETARY only.

#### Scenario: ADMIN sees all with filter
- GIVEN ADMIN authenticated
- WHEN calendar loads
- THEN all bookings render; professional filter dropdown visible

#### Scenario: PROFESSIONAL sees own only
- GIVEN PROFESSIONAL authenticated
- WHEN calendar loads
- THEN only own bookings render; no filter dropdown

#### Scenario: Unauthenticated redirects
- GIVEN no valid session
- WHEN accessing `/dashboard/calendar`
- THEN redirect to login

### Requirement: Time Grids (Week and Day)

Week: 7-day Mon–Sun grid. Day: single-day grid. Both MUST use 30-min slots 08:00–20:00. Bookings render as colored blocks at correct time. Click opens popover. Day view provides prev/next arrows.

#### Scenario: Week grid with bookings
- GIVEN 3 bookings Mon/Wed/Fri
- WHEN week view active
- THEN 7-column grid with bookings at correct day/time

#### Scenario: Day view navigates
- GIVEN day view showing Monday
- WHEN next-day arrow clicked
- THEN Tuesday rendered with its bookings

### Requirement: Month View

Month grid. Days with bookings SHALL show dot marker and count. Clicking day MUST navigate to day view.

#### Scenario: Month indicators and navigation
- GIVEN 5 bookings March 15, 2 March 20
- WHEN March month renders
- THEN March 15 count "5"; March 20 count "2"; empty days blank
- WHEN March 15 clicked
- THEN navigates to day view for 2026-03-15

### Requirement: Event Popover and Actions

Click booking MUST open shadcn Popover: patient, service, time, status badge, actions. Actions SHALL be gated by `canTransition(status, target)` + role. Labels: Confirmar, Cancelar, Completar, No Asistió, Reprogramar, Ver detalle. Successful action MUST refresh calendar without page navigation.

#### Scenario: PENDING booking shows valid actions
- GIVEN ADMIN clicks PENDING booking
- THEN Confirmar, Cancelar, Reprogramar, Ver detalle; Completar/No Asistió hidden

#### Scenario: Terminal booking shows minimal
- GIVEN COMPLETED booking clicked
- THEN only Ver detalle; no transition actions

#### Scenario: Action confirms and refreshes
- GIVEN PENDING booking; ADMIN clicks Confirmar
- WHEN server action succeeds
- THEN booking turns emerald (CONFIRMED); calendar refreshes

### Requirement: Status Colors and Locale

Booking colors MUST match `STATUS_TONE_CLASS`: PENDING→amber, CONFIRMED→emerald, CANCELLED→red, RESCHEDULED→violet, COMPLETED→emerald, NO_SHOW→red, AWAITING_PAYMENT→orange. es-AR locale SHALL apply: Monday-first week, day names Lun/Mar/Mié/Jue/Vie/Sáb/Dom, 24h time. All UI labels in Argentinian Spanish; "Hoy" present.

#### Scenario: Colors and locale consistent
- GIVEN calendar rendered in any view
- THEN event colors match `BookingStatusBadge`; headers Lun–Dom 24h; "Hoy" in Spanish

### Requirement: Navigation and Data Refetching

Previous/Next and "Hoy" buttons. URL `?date=YYYY-MM-DD&view=week|day|month` SHALL reflect current state. Range change MUST refetch bookings via server action or `router.refresh`. Rapid navigation MAY debounce refetches.

#### Scenario: Navigation refetches
- GIVEN week March 9–15
- WHEN next-week clicked
- THEN refetches March 16–22

#### Scenario: URL reflects shareable state
- GIVEN navigating to March 22 day view
- THEN URL shows `?date=2026-03-22&view=day`

#### Scenario: "Hoy" resets to current date
- GIVEN navigated 3 weeks forward
- WHEN "Hoy" clicked
- THEN returns to current week; refetches bookings

### Requirement: Empty State

No bookings in visible range MUST display view-appropriate message ("No hay turnos esta semana"/"este día"/"este mes") and "Nuevo turno" CTA linking to booking creation.

#### Scenario: Empty week
- GIVEN zero bookings in visible week
- THEN "No hay turnos esta semana" shown; "Nuevo turno" links to `/dashboard/bookings/new`

### Requirement: Mobile Responsiveness

Viewports ≤768px: week view MUST collapse to day view or scrolling agenda. Month: dot markers only. Popover SHALL adapt to bottom sheet or full dialog.

#### Scenario: Mobile 375px layout
- GIVEN viewport width 375px
- THEN week view displays as single-day scroll; popover uses full-width bottom sheet
