# Design: Bookings Module — Application + Presentation Layers

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Browser                                                            │
│    │                                                                │
│    ├── GET /dashboard/bookings ──────────────────────────────────┐  │
│    │   │                                                         │  │
│    │   ▼                                                         │  │
│    │   DashboardLayout (Server, RBAC gate)                       │  │
│    │   │  → auth.api.getSession()                                │  │
│    │   │  → PATIENT → redirect("/")                              │  │
│    │   │  → ADMIN / SECRETARY / PROFESSIONAL → render children   │  │
│    │   │                                                         │  │
│    │   └── BookingsPage (Server, async)                          │  │
│    │       │  → getOrganizationId()                              │  │
│    │       │  → session + role extraction                        │  │
│    │       │  → passes filters + orgId to data layer             │  │
│    │       │                                                     │  │
│    │       ├── BookingFilters (Client)                            │  │
│    │       │  → search, status[], professionalId, serviceId,     │  │
│    │       │    dateRange → updates URL searchParams              │  │
│    │       │                                                     │  │
│    │       └── Suspense                                          │  │
│    │           └── BookingsTableData (async Server wrapper)      │  │
│    │               │ → getBookings(orgId, filters)               │  │
│    │               │                                            │  │
│    │               └── BookingTable (Client)                     │  │
│    │                   → BookingStatusBadge (Client)             │  │
│    │                   → BookingPaymentBadge (Client)            │  │
│    │                                                             │  │
│    ├── POST (Server Action) createBooking ───────────────────────┤  │
│    │   │                                                         │  │
│    │   ▼                                                         │  │
│    │   "use server" → Zod validate → RBAC → $transaction        │  │
│    │   │  → checkAvailability + insert                           │  │
│    │   │  → revalidatePath("/dashboard/bookings")                │  │
│    │   │  → return BookingResult<Booking>                        │  │
│    │   │                                                         │  │
│    ├── POST (Server Action) confirmBooking ──────────────────────┤  │
│    │   │  → Zod validate → canTransition() → optimistic lock     │  │
│    │   │  → updateTag("bookings")                                │  │
│    │   │  → return BookingResult<void>                           │  │
│    │                                                             │  │
│    └── GET /dashboard/bookings/new (Wizard) ─────────────────────┘  │
│        │                                                            │
│        └── NewBookingPage (Client, fully interactive)               │
│            → Zustand wizard store                                   │
│            → 6-step wizard components                               │
│            → on submit: calls createBooking Server Action           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key principles:**
- **Server Components first**: list and detail pages are Server Components that fetch data and pass to Client Components.
- **Server Actions for mutations**: all CUD operations go through `"use server"` actions with Zod 4 validation and RBAC.
- **Data layer is pure**: no React/Next.js/auth imports — the caller resolves organization and role scoping.
- **Client Components for interactivity**: filters, table actions, status buttons, wizard steps.

---

## Decisions

### AD1: Data Access Layer Pattern

**Decision**: Two files — `booking-data.ts` (query operations) + `booking-availability.ts` (overlap/availability).

**Rationale**:
- Follows the dashboard pattern: single `dashboard-data.ts` (349 lines) proves one-file-per-concern works.
- Splitting into queries vs. availability is a **domain-driven split**: listing/detail queries are read-only; availability is a business rule operation that the domain's `isOverlapping` informs but the data layer must translate to a Prisma `where` clause.
- `booking-data.ts` exports: `getBookings`, `getBookingById`, `getServices`, `getPatients`, `getProfessionalsForService`.
- `booking-availability.ts` exports: `checkAvailability`, `getAvailableSlots`.

**Role scoping**:
- Data layer stays **pure** — no auth imports. It receives an optional `professionalUserId?: string` filter param.
- When `professionalUserId` is provided, `getBookings` adds `where: { professional: { userId: professionalUserId } }` to scope to the PROFESSIONAL's own bookings.
- The **caller** (page component or server action) resolves the session, extracts role, and passes the filter:
  ```typescript
  // In the page/action
  const role = session.user.role;
  const professionalUserId = role === USER_ROLE.PROFESSIONAL
    ? session.user.id
    : undefined;
  
  const bookings = await getBookings(orgId, { professionalUserId, ...filters });
  ```

**Typed results**:
```typescript
// booking-data.types.ts
export interface EnrichedBooking {
  id: string;
  organizationId: string;
  patientId: string | null;
  startTime: Date;
  endTime: Date;
  status: BookingStatusType;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: { id: string; user: { name: string; email: string } } | null;
  professional: { id: string; user: { name: string } };
  service: { id: string; name: string; durationMinutes: number; price: number; paymentType: PaymentTypeType };
  payments: { id: string; status: string; amount: number }[];
}

export interface BookingFilters {
  dateRange?: { start: Date; end: Date };
  professionalId?: string;
  serviceId?: string;
  status?: BookingStatusType[];
  search?: string;
  professionalUserId?: string;  // RBAC scoping
  page?: number;
  pageSize?: number;
}
```

**Alternatives considered**:
- Single `booking-data.ts` with all 7 functions — rejected because availability logic is a separate concern with different consumers (wizard step 3, create action, reschedule action).
- Per-function files — overkill for this module size. Auth pattern uses one file per action, but that's for `"use server"` boundaries, not data queries.

---

### AD2: Server Action Pattern

**Decision**: One file per action in `src/modules/bookings/actions/`. Shared Zod 4 schemas in `booking-actions.schema.ts`. Returns `BookingResult<T>` discriminated union.

**Rationale**:
- Follows the auth module convention exactly: `login.action.ts`, `logout.action.ts`, etc.
- Each action is a separate `"use server"` boundary — Next.js enforces this at the per-file level.
- Shared schemas (in a separate file) avoid duplicating `createBookingSchema`, `confirmBookingSchema`, etc., across files.

**Return type — `BookingResult<T>`**:
```typescript
// booking-actions.types.ts
type BookingSuccess<T> = { success: true; data: T };
type BookingError = { success: false; error: string };
type BookingResult<T = void> = BookingSuccess<T> | BookingError;
```

Follows the exact discriminated union pattern from `AuthResult<T>` in `@/modules/auth/types`, but defined locally to avoid cross-module coupling. Consumer switches on `result.success` to narrow the union.

**Action file structure (every action follows this same skeleton)**:
```typescript
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";

import { auth } from "@/core/auth/auth-instance";
import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@/modules/auth/domain/roles";
import { canTransition, calculateEndTime } from "@/modules/bookings/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";

import { createBookingSchema } from "./booking-actions.schema";
import type { BookingResult } from "./booking-actions.types";

export async function createBooking(
  input: CreateBookingInput
): Promise<BookingResult<Booking>> {
  // 1. Zod 4 validation
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // 2. Auth: get session + organization
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autenticado" };
  }

  const role = session.user.role;
  const organizationId = await getOrganizationId();

  // 3. RBAC: PROFESSIONAL can only create for themselves
  if (role === USER_ROLE.PROFESSIONAL) {
    const professional = await prisma.professional.findFirst({
      where: { userId: session.user.id, organizationId },
    });
    if (!professional || professional.id !== parsed.data.professionalId) {
      return { success: false, error: "No autorizado" };
    }
  }

  // 4. Business logic: verify service, calculate end time
  // 5. prisma.$transaction: overlap check + insert
  // 6. revalidatePath("/dashboard/bookings")
  // 7. Return success
}
```

**Revalidation strategy**:
- `revalidatePath("/dashboard/bookings")` after every mutation — triggers regeneration of the bookings list page.
- Dashboard page (today bookings, metrics) is NOT revalidated from booking actions — it's a separate concern. Acceptable staleness for now.
- Future: migrate to `"use cache"` + `cacheTag("bookings")` + `updateTag("bookings")` for SWR-style background revalidation.

**Alternatives considered**:
- Single `booking-actions.ts` with all 6 actions — rejected because:
  1. Auth module convention uses per-action files.
  2. 6 actions × ~40 lines = 240 lines. At the edge of reviewability but more importantly: each action is an independent concern with its own RBAC logic and edge cases.
  3. File-per-action makes git blame and test isolation cleaner.
- `revalidatePath` vs. `updateTag`: `revalidatePath` wins for simplicity since the codebase doesn't use `"use cache"` directives yet. `updateTag` requires opt-in caching at the data layer. We add caching later.

---

### AD3: Overlap Detection + Optimistic Locking

**Decision**: `prisma.$transaction` with interactive mode for atomic create/reschedule. `updatedAt` in WHERE clause for status transitions.

**Create / Reschedule — interactive transaction**:
```typescript
const booking = await prisma.$transaction(async (tx) => {
  // Step 1: Check overlap (SELECT)
  const overlap = await tx.booking.findFirst({
    where: {
      organizationId,
      professionalId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startTime: { lt: newEndTime },
      endTime: { gt: newStartTime },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  if (overlap) {
    throw new OverlapError("El horario solicitado está ocupado");
  }

  // Step 2: Insert (if safe)
  return tx.booking.create({
    data: {
      organizationId,
      patientId: parsed.data.patientId ?? null,
      professionalId: parsed.data.professionalId,
      serviceId: parsed.data.serviceId,
      startTime: newStartTime,
      endTime: newEndTime,
      status: BookingStatus.PENDING,
      notes: guestInfo ?? parsed.data.notes,
    },
    include: { patient: true, professional: true, service: true, payments: true },
  });
});
```

The `$transaction` ensures atomicity: the overlap check and the insert happen in a single snapshot. If two concurrent requests arrive for the same slot, the second one will see the first's insert and reject.

**Optimistic locking for status transitions**:
```typescript
try {
  const updated = await prisma.booking.update({
    where: {
      id: bookingId,
      updatedAt: currentUpdatedAt, // optimistic lock
    },
    data: { status: newStatus },
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return { success: false, error: "El turno fue modificado por otro usuario. Recargá la página." };
  }
  throw error;
}
```

- `P2025` = "Record not found" (Prisma error code). When the `where` clause doesn't match, either the booking doesn't exist OR the `updatedAt` changed.
- On catch: return a user-facing error. The UI should prompt the user to reload the page to get the latest state.

**Availability check as a separate data function — for UI pre-check**:
```typescript
// booking-availability.ts — NON-ATOMIC, for wizard UI
export async function checkAvailability(
  organizationId: string,
  professionalId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
): Promise<boolean> {
  const overlap = await prisma.booking.findFirst({
    where: {
      organizationId,
      professionalId,
      status: { not: { in: ["CANCELLED", "NO_SHOW"] } },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
  });
  return overlap === null; // true = available, false = occupied
}
```

This is **not atomic** — a slot can be free when `checkAvailability` returns and occupied 1ms later. The `$transaction` in `createBooking` is the final arbiter. The UI function gives the user a good-faith preview.

**Alternatives considered**:
- `SELECT ... FOR UPDATE` — PostgreSQL row-level lock. More complex, requires raw SQL via `prisma.$queryRaw`. Not worth it for this scale; `$transaction` with optimistic locking is sufficient.
- Multi-column unique index `(professionalId, startTime)` — prevents exact-same-start bookings but doesn't catch overlaps (e.g., 09:00-09:30 vs 09:15-09:45). Overlap check is still needed.

---

### AD4: Wizard State Management

**Decision**: Zustand 5 `create` store, local per-page. Cleared on mount. 6 numbered steps.

**Store location**: `src/modules/bookings/presentation/wizard-store.ts`

**State shape**:
```typescript
import { create } from "zustand";

interface WizardState {
  // Step data
  serviceId: string | null;
  professionalId: string | null;
  date: Date | null;
  startTime: string | null;   // "HH:mm"
  endTime: string | null;     // "HH:mm"
  patientId: string | null;   // null = guest
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  notes: string;

  // UI state
  currentStep: number;        // 1-6
  isSubmitting: boolean;

  // Actions
  setService: (id: string) => void;
  setProfessional: (id: string) => void;
  setSchedule: (date: Date, startTime: string, endTime: string) => void;
  setPatient: (id: string | null) => void;
  setGuest: (name: string, phone: string, email: string) => void;
  setNotes: (notes: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
}

const initialState = {
  serviceId: null,
  professionalId: null,
  date: null,
  startTime: null,
  endTime: null,
  patientId: null,
  guestName: "",
  guestPhone: "",
  guestEmail: "",
  notes: "",
  currentStep: 1,
  isSubmitting: false,
};

export const useWizardStore = create<WizardState>((set) => ({
  ...initialState,
  setService: (serviceId) => set({ serviceId, professionalId: null, date: null, startTime: null, endTime: null }),
  setProfessional: (professionalId) => set({ professionalId, date: null, startTime: null, endTime: null }),
  setSchedule: (date, startTime, endTime) => set({ date, startTime, endTime }),
  setPatient: (patientId) => set({ patientId, guestName: "", guestPhone: "", guestEmail: "" }),
  setGuest: (guestName, guestPhone, guestEmail) => set({ guestName, guestPhone, guestEmail, patientId: null }),
  setNotes: (notes) => set({ notes }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 6) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  goToStep: (step) => set({ currentStep: Math.max(1, Math.min(step, 6)) }),
  reset: () => set(initialState),
}));
```

**Step flow**:
1. **ServiceStep** — select service (fetches `getServices()`)
2. **ProfessionalStep** — select professional filtered by service (fetches `getProfessionalsForService(serviceId)`)
3. **ScheduleStep** — pick date + time slot (fetches `getAvailableSlots(professionalId, serviceId, date)`)
4. **CustomerStep** — search existing patient OR enter guest info (name, phone, email)
5. **PaymentStep** — placeholder (reads service.paymentType, shows amount, disabled for now)
6. **ConfirmStep** — summary of all selections, "Confirmar" button calls `createBooking` Server Action

**Per-step validation** — the `nextStep()` action checks:
- Step 1 → 2: `serviceId !== null`
- Step 2 → 3: `professionalId !== null`
- Step 3 → 4: `date !== null && startTime !== null && endTime !== null`
- Step 4 → 5: `patientId !== null` OR `guestName !== "" && guestPhone !== ""`
- Step 5 → 6: always allowed (placeholder)
- Step 6 submit: `createBooking()` validates server-side

**Mount cleanup**:
```tsx
// In NewBookingPage
useEffect(() => {
  useWizardStore.getState().reset();
}, []);
```

**Why Zustand and not URL-driven / `useActionState`:**
- The proposal initially suggested URL-driven steps + `useActionState`. But collecting data across 6 steps requires persistent state that survives re-renders. URL params for each field are unwieldy.
- `useActionState` works well for single-form submissions, not multi-step wizards.
- Zustand 5 provides a simple, testable store with no provider boilerplate. It's already in the project's SDK list.
- Store is **local per-page** (no `persist` middleware) — cleared on mount, no stale data.

---

### AD5: Component Tree — Server/Client Boundary

**Decision**: List and Detail pages are Server Components with async data-fetching wrappers. Wizard page is fully Client.

**List page: `BookingsPage` (Server Component)**:
```
BookingsPage (Server, async)
│  → getOrganizationId()
│  → auth.api.getSession() → role, userId
│  → searchParams from URL (status, professionalId, serviceId, search, dateRange)
│
├── <BookingsHeader /> (Client) — title + "Nuevo Turno" button
│
├── <BookingSearchBar /> (Client)
│   → input text search, updates URL params on submit
│
├── <BookingFilters /> (Client)  
│   → status checkboxes, professional select, service select, date range picker
│   → updates URL searchParams → triggers server re-render
│
├── <Suspense fallback={<TableSkeleton />}>
│   └── <BookingsTableDataWrapper organizationId={orgId} filters={...} />
│       (async Server Component that calls getBookings())
│       │
│       └── <BookingTable bookings={enrichedBookings} /> (Client)
│           ├── <BookingStatusBadge status={b.status} /> (Client)
│           ├── <BookingPaymentBadge paymentType={b.service.paymentType} />
│           │   (Client)
│           └── <TableRowAction> (Client) — link to detail page
│
└── <BookingsEmptyState /> (Client) — shown when getBookings returns []
    → rendered conditionally
```

**Why `BookingsTableDataWrapper`?** Following the dashboard page pattern (see `TopServicesData`, `TodayBookingsData` wrappers in `dashboard/page.tsx`). The thin async wrapper is needed because Suspense only works on components that read dynamic data (async functions). The page itself is async, but Suspense boundaries need their own async children.

**Detail page: `BookingDetailPage` (Server Component)**:
```
BookingDetailPage (Server, async)
│  → params.id → getBookingById(orgId, id)
│  → 404 if null
│  → role check: PROFESSIONAL can only see own
│
└── <BookingDetail booking={enriched} role={role} userId={userId} /> (Client)
    ├── <BookingDetailHeader /> — patient name, status badge, date/time
    ├── <BookingDetailInfo /> — professional, service, notes, payment info
    └── <BookingDetailActions booking={enriched} role={role} userId={userId} />
        (Client — action buttons gated by canTransition + role)
        ├── "Confirmar" — calls confirmBooking(id, updatedAt)
        ├── "Reprogramar" — opens reschedule dialog
        ├── "Completar" — calls completeBooking(id, updatedAt)
        ├── "No asistió" — calls markNoShow(id, updatedAt)
        └── "Cancelar" — calls cancelBooking(id, reason, updatedAt)
```

**Wizard page: `NewBookingPage` (Client Component)**:
```
NewBookingPage (Client — "use client")
│  → useEffect: wizardStore.reset()
│
├── <WizardProgress currentStep={currentStep} /> (Client)
│   → 6 dots/steps visual indicator
│
├── <WizardSteps> (Client)
│   ├── Step 1: <ServiceStep />
│   │   → fetches getServices() via fetch or server action
│   │   → renders service cards, onClick → setService()
│   │
│   ├── Step 2: <ProfessionalStep />
│   │   → fetches getProfessionalsForService(serviceId)
│   │   → professional cards with name/specialties
│   │
│   ├── Step 3: <ScheduleStep />
│   │   → date picker + time slot grid
│   │   → fetches getAvailableSlots(professionalId, serviceId, date)
│   │   → renders available slots as clickable buttons
│   │
│   ├── Step 4: <CustomerStep />
│   │   → search input → debounced fetch getPatients(search)
│   │   → patient results as selectable list
│   │   → OR toggle to guest form (name, phone, email inputs)
│   │
│   ├── Step 5: <PaymentStep />
│   │   → reads service.paymentType and price from wizard store
│   │   → placeholder: shows "Próximamente — Pago en consultorio"
│   │
│   └── Step 6: <ConfirmStep />
│       → summary card of all selections
│       → "Confirmar Turno" button → createBooking(...)
│       → on success → redirect to /dashboard/bookings/[id]
│       → on error → show error toast, stay on step 6
│
└── <WizardNavigation /> (Client)
    → "Anterior" / "Siguiente" buttons
    → prevStep() / nextStep()
```

**Server/Client boundary rules**:
- Server Components: fetch data, pass as props to Client Components.
- Client Components: receive data as props, handle interactivity (clicks, forms, filters).
- The wizard is fully Client because it needs `useState`, `useEffect`, Zustand store, and click handlers across 6 steps.

---

### AD6: File Structure

**Decision**: Module-organized by layer. Components split between `src/components/bookings/` (presentational) and `src/modules/bookings/` (logic).

```
src/modules/bookings/
├── domain/                               # EXISTS — modified
│   ├── booking.ts                        # UNCHANGED
│   ├── booking.schema.ts                 # MODIFIED: patientId → optional
│   ├── time-slot.ts                      # UNCHANGED
│   ├── __tests__/                        # UNCHANGED (will add patientId-optional test)
│   └── index.ts                          # UNCHANGED
│
├── data/                                 # NEW — pure data access
│   ├── booking-data.ts                   # getBookings, getBookingById, getServices,
│   │                                     #   getPatients, getProfessionalsForService
│   ├── booking-data.types.ts             # EnrichedBooking, BookingFilters
│   ├── booking-availability.ts           # checkAvailability, getAvailableSlots
│   └── __tests__/
│       ├── booking-data.test.ts
│       └── booking-availability.test.ts
│
├── actions/                              # NEW — Server Actions
│   ├── create-booking.action.ts          # createBooking
│   ├── confirm-booking.action.ts         # confirmBooking
│   ├── cancel-booking.action.ts          # cancelBooking
│   ├── complete-booking.action.ts        # completeBooking
│   ├── mark-no-show.action.ts            # markNoShow
│   ├── reschedule-booking.action.ts      # rescheduleBooking
│   ├── booking-actions.schema.ts         # Zod 4 input schemas for all 6 actions
│   ├── booking-actions.types.ts          # BookingResult<T>, CreateBookingInput, etc.
│   └── __tests__/
│       ├── create-booking.test.ts
│       ├── confirm-booking.test.ts
│       ├── cancel-booking.test.ts
│       ├── complete-booking.test.ts
│       ├── mark-no-show.test.ts
│       └── reschedule-booking.test.ts
│
├── presentation/                         # NEW — pure utilities + stores
│   ├── wizard-store.ts                   # Zustand 5 wizard state
│   └── index.ts                          # barrel exports
│
└── index.ts                              # MODIFIED — export all layers
    export * from "./domain";
    export * from "./data/booking-data";
    export * from "./data/booking-availability";
    export * from "./actions/create-booking.action";
    // ... all actions
    export * from "./presentation/wizard-store";

src/components/bookings/                  # NEW — presentational components
├── booking-table.tsx                     # Client: shadcn/ui Table + status/payment badges
├── booking-filters.tsx                   # Client: status checkboxes, selects, date range
├── booking-search-bar.tsx                # Client: text search input
├── booking-status-badge.tsx              # Client: visual badge per status
├── booking-payment-badge.tsx             # Client: payment type indicator
├── booking-detail.tsx                    # Client: detail info + action buttons
├── booking-detail-actions.tsx            # Client: action buttons gated by RBAC + canTransition
├── booking-empty-state.tsx               # Client: "No se encontraron turnos" message
├── booking-table-skeleton.tsx            # Client: loading skeleton for table
└── wizard/
    ├── wizard-progress.tsx               # Client: step indicator (1-6 dots)
    ├── wizard-navigation.tsx             # Client: prev/next buttons
    ├── wizard-step-service.tsx           # Client: step 1 — service selection
    ├── wizard-step-professional.tsx      # Client: step 2 — professional selection
    ├── wizard-step-schedule.tsx          # Client: step 3 — date + time slots
    ├── wizard-step-customer.tsx          # Client: step 4 — patient search or guest form
    ├── wizard-step-payment.tsx           # Client: step 5 — payment placeholder
    └── wizard-step-confirm.tsx           # Client: step 6 — summary + confirm

src/app/(dashboard)/bookings/             # NEW — route pages
├── page.tsx                              # Server: list page
├── [id]/
│   └── page.tsx                          # Server: detail page
└── new/
    └── page.tsx                          # Client: wizard page

prisma/
├── schema.prisma                         # MODIFIED: patientId String → String?
└── migrations/                           # NEW migration: make_booking_patient_optional
```

---

### AD7: Migration Strategy

**Decision**: Single migration — `make_booking_patient_optional` — changes only the `patientId` column from required to optional.

**Prisma schema changes**:
```diff
model Booking {
  id             String       @id @default(uuid())
  organizationId String
-  patientId      String
+  patientId      String?
-  patient        Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)
+  patient        Patient?     @relation(fields: [patientId], references: [id], onDelete: SetNull, onUpdate: Cascade)
  ...
}
```

**Key change**: The relation `onDelete` changes from `Cascade` to `SetNull`. When a Patient is deleted, the Booking's `patientId` is set to NULL instead of deleting the Booking. This preserves booking history for guest/legacy records.

**Domain schema change**:
```diff
- patientId: z.uuid({ error: "Invalid UUID" }),
+ patientId: z.uuid({ error: "Invalid UUID" }).optional(),
```

**Migration command**:
```bash
pnpm prisma migrate dev --name make_booking_patient_optional
```

**Seed impact**:
- Existing seed creates bookings with `patientId` — no data loss, column becomes nullable.
- Add 1-2 guest bookings (with `patientId: null` and guest info in `notes`) to the seed for development testing.

**Guest booking info storage**:
- Guest name, phone, and email are stored in the `notes` field as structured text:
  `"Invitado: Juan Pérez | Tel: 351-1234567 | Email: juan@email.com"`
- This is a **pragmatic MVP decision**. A future migration should add dedicated `guestName`, `guestPhone`, `guestEmail` columns to the Booking model.
- The wizard's `createBooking` action formats guest info into `notes` when `patientId` is null.

**Rollback**:
1. Clean any rows with `patientId: null` (guest bookings).
2. Revert `patientId` to `String` (required) in schema.
3. `pnpm prisma migrate dev --name make_booking_patient_required`
4. Revert domain schema.

---

### AD8: RBAC Enforcement

**Decision**: Three-layer enforcement — layout (route-level), page/action (session + role), data layer (filter params from caller).

**Layer 1 — Layout (already exists in `(dashboard)/layout.tsx`)**:
```typescript
// PATIENT users are redirected to /
if (user.role === USER_ROLE.PATIENT) {
  redirect("/");
}
```
This ensures only ADMIN, SECRETARY, and PROFESSIONAL can access `/dashboard/*` routes including bookings.

**Layer 2 — Server Actions (per-action RBAC check)**:
```typescript
const session = await auth.api.getSession({ headers: await headers() });
const role = session.user.role;

// PROFESSIONAL: can only create bookings for themselves
if (role === USER_ROLE.PROFESSIONAL) {
  const prof = await prisma.professional.findFirst({
    where: { userId: session.user.id, organizationId },
  });
  if (!prof || prof.id !== input.professionalId) {
    return { success: false, error: "No autorizado" };
  }
}

// SECRETARY + ADMIN: can create bookings for any professional

// For status transitions (confirm, cancel, etc.):
// PROFESSIONAL: can only modify their own bookings
// SECRETARY + ADMIN: can modify any booking
```

**Layer 3 — Data Layer (pure filter params)**:
```typescript
// getBookings receives professionalUserId filter from the page
// The page resolves session + role:
const role = session.user.role;
const professionalUserId = role === USER_ROLE.PROFESSIONAL
  ? session.user.id
  : undefined;

const bookings = await getBookings(orgId, {
  ...filters,
  professionalUserId, // data layer adds WHERE professional.userId = ...
});
```

The data layer does NOT import auth modules. The caller is responsible for scoping.

**Permission matrix for bookings**:

| Action | ADMIN | SECRETARY | PROFESSIONAL |
|--------|-------|-----------|-------------|
| View list | All bookings | All bookings | Own bookings only |
| View detail | Any booking | Any booking | Own bookings only |
| Create booking | Any professional | Any professional | Self only |
| Confirm booking | Any booking | Any booking | Own bookings only |
| Cancel booking | Any booking | Any booking | Own bookings only |
| Complete booking | Any booking | Any booking | Own bookings only |
| Mark no-show | Any booking | Any booking | Own bookings only |
| Reschedule booking | Any booking | Any booking | Own bookings only |

**RBAC + state machine interaction**:
- `canTransition(from, to)` is checked AFTER RBAC. If the transition is illegal per the state machine, return the domain error regardless of role.
- RBAC error: "No autorizado" (401-style).
- State machine error: "No es una transición válida" (business rule violation).

**Alternatives considered**:
- RBAC only at the data layer — rejected because data layer is pure; auth imports would violate the established pattern.
- Middleware RBAC via `proxy.ts` — rejected because the auth module already handles this in the layout. Double-gating at the action level is defense-in-depth for mutations.

---

## Component Tree

### List Page (`/dashboard/bookings`)

```
BookingsPage
├── BookingsHeader — "Turnos" title + "Nuevo Turno" button → /dashboard/bookings/new
├── BookingSearchBar — text input, on submit → updates URL ?search=
├── BookingFilters
│   ├── StatusFilter — checkboxes: Pending, Confirmada, Cancelada, etc.
│   ├── ProfessionalFilter — select dropdown (fetched via Server Component)
│   ├── ServiceFilter — select dropdown (fetched via Server Component)
│   └── DateRangeFilter — date picker for start/end range
└── Suspense fallback={<BookingTableSkeleton />}
    └── BookingsTableDataWrapper (async)
        └── BookingTable
            ├── <thead> — Fecha, Hora, Paciente, Profesional, Servicio, Estado, Pago, Monto
            └── <tbody>
                └── BookingRow × N
                    ├── BookingStatusBadge
                    ├── BookingPaymentBadge
                    └── Link → /dashboard/bookings/[id]
```

### Detail Page (`/dashboard/bookings/[id]`)

```
BookingDetailPage (async)
└── BookingDetail (Client)
    ├── BookingDetailHeader
    │   ├── Back button → /dashboard/bookings
    │   ├── Patient name + email
    │   └── BookingStatusBadge
    ├── BookingDetailInfo
    │   ├── Fecha y Hora — formatted date + startTime-endTime
    │   ├── Profesional — professional name
    │   ├── Servicio — service name + duration
    │   ├── Pago — payment status badge + amount
    │   └── Notas — notes field (includes guest info if applicable)
    └── BookingDetailActions (conditionally rendered)
        ├── [canTransition to CONFIRMED] → "Confirmar Turno"
        ├── [canTransition to RESCHEDULED] → "Reprogramar"
        ├── [canTransition to COMPLETED] → "Marcar Completado"
        ├── [canTransition to NO_SHOW] → "No Asistió"
        ├── [canTransition to CANCELLED] → "Cancelar Turno"
        └── [no transitions available] → "Sin acciones disponibles"
```

### Wizard Page (`/dashboard/bookings/new`)

```
NewBookingPage ("use client")
├── WizardProgress
│   └── 6 connected dots: Servicio → Profesional → Horario → Cliente → Pago → Confirmar
├── Step 1: WizardStepService
│   └── Grid of service cards — name, duration, price. onClick → setService() + nextStep()
├── Step 2: WizardStepProfessional
│   └── List of professional cards — name, specialties. onClick → setProfessional() + nextStep()
├── Step 3: WizardStepSchedule
│   ├── DatePicker — calendar for date selection
│   └── TimeSlotGrid — grid of available 30-min slots. onClick → setSchedule() + nextStep()
├── Step 4: WizardStepCustomer
│   ├── PatientSearch — input + debounced search → patient results list
│   ├── SelectedPatient — shows selected patient card
│   └── GuestForm — toggle: guest name, phone, email inputs
├── Step 5: WizardStepPayment
│   └── Placeholder card: "Pago en consultorio — próximamente integración con MercadoPago"
├── Step 6: WizardStepConfirm
│   ├── SummaryCard — all selected data in read-only format
│   └── "Confirmar Turno" button → createBooking() → redirect on success
└── WizardNavigation
    ├── "Anterior" button — prevStep()
    └── "Siguiente" button — nextStep() (hidden on step 6)
```

---

## Data Flow

### Flow 1: List Bookings

```
1. User navigates to /dashboard/bookings
2. DashboardLayout renders (RBAC gate)
3. BookingsPage (Server Component):
   a. getOrganizationId() → organizationId
   b. auth.api.getSession(headers) → session.user (role, userId)
   c. Extract searchParams from URL (status, professionalId, serviceId, search, dateRange)
   d. Construct BookingFilters
   e. If role === PROFESSIONAL, set professionalUserId = session.user.id
4. BookingsTableDataWrapper (async Server Component in Suspense):
   a. getBookings(organizationId, filters) → EnrichedBooking[]
   b. Render <BookingTable bookings={data} />
5. BookingTable (Client Component):
   a. Renders rows with BookingStatusBadge, BookingPaymentBadge
   b. Row click → navigate to /dashboard/bookings/[id]
6. Re-render on filter change: URL searchParams update → router.push → BookingsPage re-fetches
```

### Flow 2: Create Booking (via Wizard)

```
1. User navigates to /dashboard/bookings/new
2. NewBookingPage mounts → useEffect: wizardStore.reset()
3. Step 1: User selects service → setService(serviceId)
   a. Service data loaded via Server Component prop or fetch
4. Step 2: User selects professional → setProfessional(professionalId)
   a. getProfessionalsForService(serviceId) called via Server Action or fetch
5. Step 3: User selects date + time slot → setSchedule(date, startTime, endTime)
   a. getAvailableSlots(professionalId, serviceId, date) called
   b. Slot grid shows available 30-min blocks
6. Step 4: User selects patient OR enters guest info → setPatient(id) or setGuest(name, phone, email)
   a. getPatients(search) called on PatientSearch input
7. Step 5: Payment placeholder — no action needed
8. Step 6: User reviews summary, clicks "Confirmar Turno"
   a. wizardStore.isSubmitting = true
   b. Call createBooking Server Action with all wizard data:
      {
        serviceId, professionalId, startTime, endTime,
        patientId?, guestName?, guestPhone?, guestEmail?, notes?
      }
   c. Server Action:
      - Zod 4 validation → safeParse
      - auth.api.getSession() → role check
      - PROFESSIONAL: verify own professionalId
      - Prisma $transaction: checkAvailability + create
      - If guest mode: format guest info into notes field
      - Return { success: true, data: Booking }
   d. On success: router.push(`/dashboard/bookings/${booking.id}`)
   e. On error: show error message, keep on step 6, isSubmitting = false
```

### Flow 3: Status Transition (from Detail Page)

```
1. User clicks "Confirmar Turno" on BookingDetailActions
2. Client calls confirmBooking(bookingId, updatedAt):
   a. Zod validation → safeParse
   b. auth.api.getSession() → role check
   c. PROFESSIONAL: verify booking.professional.userId === session.user.id
   d. Fetch current booking → verify canTransition(from, CONFIRMED)
   e. Prisma update with WHERE { id, updatedAt } + SET { status: CONFIRMED }
   f. Catch P2025 → "El turno fue modificado por otro usuario"
   g. revalidatePath("/dashboard/bookings")
   h. Return { success: true } or { success: false, error }
3. Client handles result:
   a. Success → toast "Turno confirmado" + refetch booking detail
   b. Error → toast error message
```

### Flow 4: Overlap Detection (Atomic)

```
createBooking() or rescheduleBooking():
1. prisma.$transaction(async (tx) => {
     // SELECT: check for overlapping bookings
     const overlap = await tx.booking.findFirst({
       where: {
         organizationId,
         professionalId,
         status: { notIn: ["CANCELLED", "NO_SHOW"] },
         startTime: { lt: newEndTime },
         endTime: { gt: newStartTime },
         id: excludeId ? { not: excludeId } : undefined,
       },
     });
     
     if (overlap) {
       throw new OverlapError("El horario está ocupado");
     }
     
     // INSERT: create the booking
     return tx.booking.create({ data: bookingData });
   })
2. The transaction ensures no other request can insert between check and create
3. The overlap condition (startTime < newEnd AND endTime > newStart) catches:
   - A: 09:00–09:30, B: 09:15–09:45 → overlaps ✓
   - A: 09:00–09:30, B: 09:30–10:00 → NO overlap (adjacent) ✓
   - CANCELLED/NO_SHOW bookings are excluded from overlap check
```

---

## Route Design

| Route | Page | Type | Props |
|-------|------|------|-------|
| `/dashboard/bookings` | `page.tsx` | Server Component | `searchParams`: status, professionalId, serviceId, search, dateFrom, dateTo |
| `/dashboard/bookings/[id]` | `[id]/page.tsx` | Server Component | `params.id` |
| `/dashboard/bookings/new` | `new/page.tsx` | Client Component | None (Zustand-managed state) |

**URL search params for list page filters**:
- `?status=PENDING&status=CONFIRMED` — multi-value status filter
- `?professionalId=uuid` — filter by professional
- `?serviceId=uuid` — filter by service
- `?search=Juan` — text search across patient name/email
- `?dateFrom=2026-06-01&dateTo=2026-06-30` — date range filter

---

## File Manifest

### Files to Create

| File | Purpose | Phase |
|------|---------|-------|
| `src/modules/bookings/data/booking-data.ts` | 5 query functions: getBookings, getBookingById, getServices, getPatients, getProfessionalsForService | PR #1 — Data Layer |
| `src/modules/bookings/data/booking-data.types.ts` | EnrichedBooking, BookingFilters interfaces | PR #1 |
| `src/modules/bookings/data/booking-availability.ts` | checkAvailability, getAvailableSlots | PR #1 |
| `src/modules/bookings/data/__tests__/booking-data.test.ts` | Vitest tests for query functions | PR #1 |
| `src/modules/bookings/data/__tests__/booking-availability.test.ts` | Vitest tests for availability functions | PR #1 |
| `src/modules/bookings/actions/booking-actions.schema.ts` | Zod 4 schemas: createBookingSchema, confirmBookingSchema, cancelBookingSchema, completeBookingSchema, markNoShowSchema, rescheduleBookingSchema | PR #2 — Actions |
| `src/modules/bookings/actions/booking-actions.types.ts` | BookingResult<T>, CreateBookingInput, ConfirmBookingInput, etc. | PR #2 |
| `src/modules/bookings/actions/create-booking.action.ts` | Server Action | PR #2 |
| `src/modules/bookings/actions/confirm-booking.action.ts` | Server Action | PR #2 |
| `src/modules/bookings/actions/cancel-booking.action.ts` | Server Action | PR #2 |
| `src/modules/bookings/actions/complete-booking.action.ts` | Server Action | PR #2 |
| `src/modules/bookings/actions/mark-no-show.action.ts` | Server Action | PR #2 |
| `src/modules/bookings/actions/reschedule-booking.action.ts` | Server Action | PR #2 |
| `src/modules/bookings/actions/__tests__/create-booking.test.ts` | Vitest test | PR #2 |
| `src/modules/bookings/actions/__tests__/confirm-booking.test.ts` | Vitest test | PR #2 |
| `src/modules/bookings/actions/__tests__/cancel-booking.test.ts` | Vitest test | PR #2 |
| `src/modules/bookings/actions/__tests__/complete-booking.test.ts` | Vitest test | PR #2 |
| `src/modules/bookings/actions/__tests__/mark-no-show.test.ts` | Vitest test | PR #2 |
| `src/modules/bookings/actions/__tests__/reschedule-booking.test.ts` | Vitest test | PR #2 |
| `src/modules/bookings/presentation/wizard-store.ts` | Zustand 5 store | PR #5 — Wizard |
| `src/modules/bookings/presentation/index.ts` | Barrel | PR #5 |
| `src/components/bookings/booking-table.tsx` | Table component | PR #3 — List Page |
| `src/components/bookings/booking-filters.tsx` | Filter controls | PR #3 |
| `src/components/bookings/booking-search-bar.tsx` | Search input | PR #3 |
| `src/components/bookings/booking-status-badge.tsx` | Status badge | PR #3 |
| `src/components/bookings/booking-payment-badge.tsx` | Payment type badge | PR #3 |
| `src/components/bookings/booking-empty-state.tsx` | Empty state | PR #3 |
| `src/components/bookings/booking-table-skeleton.tsx` | Loading skeleton | PR #3 |
| `src/components/bookings/booking-detail.tsx` | Detail view | PR #4 — Detail Page |
| `src/components/bookings/booking-detail-actions.tsx` | Action buttons | PR #4 |
| `src/components/bookings/wizard/wizard-progress.tsx` | Step indicator | PR #5 |
| `src/components/bookings/wizard/wizard-navigation.tsx` | Prev/next buttons | PR #5 |
| `src/components/bookings/wizard/wizard-step-service.tsx` | Step 1 | PR #5 |
| `src/components/bookings/wizard/wizard-step-professional.tsx` | Step 2 | PR #5 |
| `src/components/bookings/wizard/wizard-step-schedule.tsx` | Step 3 | PR #5 |
| `src/components/bookings/wizard/wizard-step-customer.tsx` | Step 4 | PR #5 |
| `src/components/bookings/wizard/wizard-step-payment.tsx` | Step 5 (placeholder) | PR #5 |
| `src/components/bookings/wizard/wizard-step-confirm.tsx` | Step 6 | PR #5 |
| `src/app/(dashboard)/bookings/page.tsx` | List page | PR #3 |
| `src/app/(dashboard)/bookings/[id]/page.tsx` | Detail page | PR #4 |
| `src/app/(dashboard)/bookings/new/page.tsx` | Wizard page | PR #5 |

### Files to Modify

| File | Change | Phase |
|------|--------|-------|
| `prisma/schema.prisma` | `patientId String` → `String?`, relation `Patient` → `Patient?`, `onDelete: Cascade` → `onDelete: SetNull` | PR #1 |
| `src/modules/bookings/domain/booking.schema.ts` | `patientId: z.uuid()` → `z.uuid().optional()` | PR #1 |
| `src/modules/bookings/index.ts` | Add exports for data, actions, presentation layers | PR #1 (additive across PRs) |
| `prisma/seed.ts` | Add 1-2 guest bookings (patientId: null, guest info in notes) | PR #1 |

### Files NOT Modified

| File | Reason |
|------|--------|
| `src/modules/bookings/domain/booking.ts` | State machine unchanged |
| `src/modules/bookings/domain/time-slot.ts` | Overlap logic unchanged |
| `src/modules/bookings/domain/__tests__/booking.test.ts` | Existing tests still valid; add optional patientId test |
| `src/modules/dashboard/data/dashboard-data.ts` | Already queries bookings for dashboard metrics — no change needed |
| `src/modules/dashboard/presentation/formatters.ts` | Reused as-is; imported from `@/modules/dashboard` |
| `src/app/(dashboard)/layout.tsx` | Already has PATIENT redirect — no change needed |
| `src/modules/auth/*` | No changes needed |

---

## Migration

### Prisma Migration: `make_booking_patient_optional`

**Schema changes:**
```diff
model Booking {
  id             String       @id @default(uuid())
  organizationId String
- patientId      String
+ patientId      String?
- patient        Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)
+ patient        Patient?     @relation(fields: [patientId], references: [id], onDelete: SetNull, onUpdate: Cascade)
  ...
}
```

**SQL generated (approximate):**
```sql
ALTER TABLE "Booking" ALTER COLUMN "patientId" DROP NOT NULL;
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_patientId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

**Domain schema change:**
```diff
// booking.schema.ts
- patientId: z.uuid({ error: "Invalid UUID" }),
+ patientId: z.uuid({ error: "Invalid UUID" }).optional(),
```

**Steps:**
1. Modify `prisma/schema.prisma` (patientId optional + relation update)
2. `pnpm prisma migrate dev --name make_booking_patient_optional`
3. Modify `booking.schema.ts` (patientId optional)
4. Update `index.ts` barrel exports
5. Run `pnpm test` to verify domain tests still pass
6. Run `pnpm db:seed` to verify seed works with new schema

**Seed additions (development):**
```typescript
// Add guest bookings to seed.ts
await prisma.booking.create({
  data: {
    organizationId: org.id,
    professionalId: prof1.id,
    serviceId: consulta.id,
    startTime: addDays(startOfWeek, 3),
    endTime: addMinutes(addDays(startOfWeek, 3), 30),
    status: "PENDING",
    notes: "Invitado: María Gómez | Tel: 351-9876543 | Email: maria@email.com",
  },
});
```

---

## Phasing (Chained PRs)

| PR | Scope | Key files | Est. lines |
|----|-------|-----------|------------|
| **#1: Data Layer + Migration** | `booking-data.ts`, `booking-availability.ts`, types, migration, domain schema update | 8 files | ~350 |
| **#2: Server Actions** | 6 action files + shared schemas + types + all tests | 14 files | ~450 |
| **#3: List Page** | `page.tsx`, table, filters, search bar, badges, empty state, skeleton | 9 files | ~350 |
| **#4: Detail Page** | `[id]/page.tsx`, detail component, action buttons | 4 files | ~300 |
| **#5: Creation Wizard** | `new/page.tsx`, wizard store, 6 step components, progress, navigation | 10 files | ~400 |

**Total:** ~1850 lines across 5 chained PRs. Each within or near the 400-line review budget.

---

## Testing Strategy

### Data Layer Tests (Vitest, PR #1)

- **Mock Prisma client** using `vi.mock("@/lib/prisma")`.
- Test `getBookings`: verify filters applied, PROFESSIONAL scoping, pagination, relation includes.
- Test `getBookingById`: returns null for missing ID, returns enriched booking with relations.
- Test `checkAvailability`: returns true when no overlap, false when overlap exists, excludes self on reschedule.
- Test `getAvailableSlots`: correct slot calculation from duration + existing bookings.
- Test `getServices`: returns only ACTIVE services.
- Test `getPatients`: search by name or email, returns matching patients.

### Server Action Tests (Vitest, PR #2)

- **Mock Prisma + auth + headers**.
- Test `createBooking`:
  - Success: valid input, no overlap → returns booking.
  - Overlap: conflicting booking exists → returns "Slot is occupied".
  - Invalid input: missing required fields → returns Zod error.
  - Guest: no patientId → booking created with notes containing guest info.
  - RBAC: PROFESSIONAL creating for another professional → "No autorizado".
- Test status transitions:
  - Valid transition (PENDING → CONFIRMED) → success.
  - Invalid transition (COMPLETED → CONFIRMED) → "Not a valid transition".
  - Optimistic locking: wrong `updatedAt` → "Modified by another user".
- Test `rescheduleBooking`: old gets RESCHEDULED, new PENDING, overlap check excludes old.

### Presentational Components (Vitest + Testing Library, PRs #3-#5)

- Test `BookingStatusBadge`: renders correct label and color per status.
- Test `BookingTable`: renders rows, empty state when empty.
- Test `BookingFilters`: status checkboxes toggle URL params.
- Test wizard store: step navigation, set/reset actions.
- Test wizard steps: validation blocks advance, data set correctly.

---

## Key Learnings from Codebase Exploration

1. **Dashboard pattern is the template**: `dashboard-data.ts` proves the pattern — pure async functions, `organizationId` first, no framework imports. Bookings follows this exactly and becomes the second module to adopt it.
2. **Auth actions pattern for Server Actions**: `login.action.ts` shows `"use server"` + Zod `safeParse` + discriminated union return type. Bookings follows this with `BookingResult<T>`.
3. **Suspense boundaries need thin async wrappers**: The dashboard page uses `TopServicesData` wrappers because Suspense only works on components that read dynamic data (async functions). The bookings list page adopts this pattern.
4. **Prisma 7 uses driver adapter**: `PrismaPg` adapter in `lib/prisma.ts`. Transaction support works with `$transaction(async (tx) => { ... })`.
5. **No existing `"use cache"` directives**: The codebase doesn't use Next.js 16 caching yet. Using `revalidatePath` for now; `updateTag` migration is a future optimization.
6. **Guest booking storage**: `patientId` becomes nullable. Guest info (name, phone, email) stored in `notes` field as structured text. Dedicated guest columns are a future migration.
