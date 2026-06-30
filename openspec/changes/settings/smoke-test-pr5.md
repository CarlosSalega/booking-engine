# PR #5 — Smoke Test Checklist (Settings: Cancellations Tab + Page Wiring)

> **Status**: PR #5 implementation complete. Manual smoke test required
> to verify the user-visible behavior across roles before merge.
> Automated coverage: 214/214 settings tests, 1427/1427 full suite, type-check + lint clean.
> E2E is not yet wired up (Playwright not configured) — this checklist
> is the manual verification gate.

---

## 1. Setup

```bash
# 1. Migrate (idempotent — settings migration was applied in PR #1)
pnpm prisma migrate dev

# 2. Seed an ADMIN user + a SECRETARY user + a PROFESSIONAL user.
#    (Seeds are project-specific; see prisma/seed.ts and your .env)

# 3. Boot the app
pnpm dev
```

Open `http://localhost:3000`.

---

## 2. ADMIN smoke — happy path (the most important pass)

**Login**: as `admin@<your-org>.test` (or whichever seed user has `role=ADMIN`).

### 2.1 — Land on the settings page

- [ ] Visit `/dashboard/settings`.
- [ ] The page header shows **"Configuración"** + a back-to-panel button.
- [ ] Three tabs are visible in this order: **Negocio · Reservas · Cancelaciones**.
- [ ] The **Negocio** tab is active by default.
- [ ] The "View-only" banner is **NOT** visible (ADMIN is editable).
- [ ] No skeleton spinner is shown after the initial load (cache is warm after the first hit).

### 2.2 — Negocio tab (PR #4 form)

- [ ] Fields are populated from the cached row (timezone, phone, email, name, address, description).
- [ ] On greenfield (no row yet), defaults are used: empty `name`, `America/Argentina/Buenos_Aires` timezone.
- [ ] Edit the **name** to a new value, click **Guardar**.
- [ ] Toast: **"Configuración guardada"** appears.
- [ ] Page refreshes; the new name persists in the form after the refresh.
- [ ] Database row reflects the change (psql / Prisma Studio).

### 2.3 — Reservas tab (PR #4 form)

- [ ] Switch to **Reservas** (state from Negocio is preserved — no flicker, no reset).
- [ ] All four fields are populated from the cached row.
- [ ] Each field shows its helper-text range (5–480, 0–168, 1–200, 0–120).
- [ ] Edit `defaultDurationMinutes` to a valid value, click **Guardar**.
- [ ] Toast success + page refreshes; new value persists.
- [ ] Range guard: enter `0` for `defaultDurationMinutes` → inline error in Spanish, action NOT called.

### 2.4 — Cancelaciones tab (PR #5 form) — **the new piece**

- [ ] Switch to **Cancelaciones**.
- [ ] Two controls visible:
  - A **Switch** labeled **"Habilitar cancelaciones"** with a helper text.
  - A **number input** labeled **"Límite de cancelación (horas)"** with helper text **"Entre 0 y 168 horas..."**.
- [ ] Both controls are populated from the cached row (toggle position + hours value).
- [ ] Click **Guardar** without changes → toast **"Configuración guardada"**, no error.

**Toggle behavior (the spec's two scenarios)**:
- [ ] Click the toggle to turn it **OFF** (red/unchecked state).
- [ ] The hours field becomes **disabled** (visibly grayed-out; cannot be focused or typed in).
- [ ] Click the toggle **ON** again.
- [ ] The hours field becomes **enabled** (focusable; current value preserved).
- [ ] Edit the hours to `48`, click **Guardar** → toast success, value persists.

**Range guard**:
- [ ] Enter `169` in hours → click **Guardar** → inline Spanish error, no DB write.
- [ ] Enter `-1` in hours → click **Guardar** → inline Spanish error, no DB write.
- [ ] Enter `0` (valid lower bound) → click **Guardar** → success.

**Toggle-off submit** (the spec's pre-fill preservation):
- [ ] Toggle OFF, set hours to `12`, click **Guardar**.
- [ ] Verify in DB: `cancellationEnabled = false`, `cancellationLimitHours = 12`.
- [ ] Reload the page; toggle should be OFF, hours should be `12`.

**Error path** (simulate by stopping Prisma):
- [ ] Stop the dev server, restart, but disconnect DB briefly — observe error toast + inline banner with the action's Spanish message.
- [ ] Form retains the entered values (no reset on error).

### 2.5 — Cache invalidation cross-check

- [ ] After saving in Negocio, switch to Cancelaciones — the **Negocio** value is still persisted (verify DB).
- [ ] After saving in Cancelaciones, switch to Negocio — the **Cancelaciones** value is still persisted.
- [ ] Open a second browser window, load `/dashboard/settings` — should show the same values (same cache, no stale data).

---

## 3. SECRETARY smoke — read-only path

**Login**: as `secretary@<your-org>.test` (or whichever seed user has `role=SECRETARY`).

- [ ] Visit `/dashboard/settings`.
- [ ] The **"View-only" banner** is visible above the tab content (Spanish: *"Modo sólo lectura — contactá al administrador para editar la configuración."*).
- [ ] All three tabs are still navigable (you can switch between them).
- [ ] On **Negocio**: every input + the submit button are **disabled** (gray, non-focusable).
- [ ] On **Reservas**: same — every field + submit are disabled.
- [ ] On **Cancelaciones**:
  - The **Switch** is disabled.
  - The **hours input** is disabled.
  - The **submit button** is disabled.
- [ ] No `toast.error("Acceso denegado")` fires (SECRETARY is allowed to view).
- [ ] Tabs render with pre-filled values from the cached row (read works, write is gated).

---

## 4. PROFESSIONAL smoke — guard blocks

**Login**: as `professional@<your-org>.test` (or whichever seed user has `role=PROFESSIONAL`).

- [ ] Visit `/dashboard/settings` (or paste the URL).
- [ ] Toast error appears: **"Acceso denegado"** (Spanish).
- [ ] The page redirects to `/dashboard`.
- [ ] The settings page does NOT render any tab content.
- [ ] (No "View-only" banner — the guard redirects before rendering.)

---

## 5. PATIENT smoke — guard blocks (defense-in-depth)

**Login**: as a PATIENT user.

- [ ] The dashboard layout already redirects PATIENT away from `/dashboard` to `/`. If they reach `/dashboard/settings` directly:
- [ ] Same behavior as PROFESSIONAL: toast **"Acceso denegado"** + redirect to `/dashboard`.

---

## 6. Unauthenticated smoke — layout boundary

- [ ] Log out (clear cookies).
- [ ] Visit `/dashboard/settings` directly.
- [ ] The dashboard layout redirects to `/login` (the SettingsGuard returns `null` and does NOT race the layout redirect).
- [ ] No infinite spinner, no `Acceso denegado` toast.

---

## 7. RBAC enforcement on write (defense-in-depth at the Server Action)

- [ ] With a SECRETARY session, attempt to call `updateBusiness` (or any of the three settings actions) via the browser dev tools / a manual fetch.
- [ ] The action returns `{ success: false, error: "No autorizado" }` — even though the form is disabled, the action itself is ADMIN-only.
- [ ] Same for `updateBookings` and `updateCancellations`.

---

## 8. Cross-PR regression checks (PR #1 + #2 + #3 + #4 must still work)

- [ ] `/dashboard` still loads, shows the sidebar, the **Configuración** link is visible for ADMIN and SECRETARY (not for PROFESSIONAL / PATIENT).
- [ ] The **Configuración** link in the sidebar is at the same position as before; clicking it lands on `/dashboard/settings`.
- [ ] The other dashboard sections (Servicios, Profesionales, Reservas, Calendario) still render correctly.
- [ ] Existing features (create service, create professional, book a slot) are unaffected by the settings change.

---

## 9. Visual / accessibility checks

- [ ] Tab focus order is logical: tablist → active content → submit button.
- [ ] The Switch is keyboard-operable (Space toggles it, Tab moves focus).
- [ ] The Switch's accessible name is **"Habilitar cancelaciones"** (verify in dev tools accessibility panel).
- [ ] Inline errors have `role="alert"` (screen readers announce them).
- [ ] The "View-only" banner has `role="status"` (polite announcement).
- [ ] All Spanish text is in neutral / Argentinian-neutral Spanish (no regional slang).

---

## 10. Build + lint + type-check final pass

```bash
pnpm test          # expect 1427/1427
pnpm type-check    # expect 0 errors
pnpm lint          # expect 0 errors
pnpm build         # expect success
```

- [ ] `pnpm test` → 1427/1427
- [ ] `pnpm type-check` → 0 errors, 0 warnings
- [ ] `pnpm lint` → 0 errors, 0 warnings
- [ ] `pnpm build` → success (no Next.js compile errors)

---

## Sign-off

When every box above is checked:

- [ ] All ADMIN scenarios pass
- [ ] SECRETARY sees read-only banner + disabled fields
- [ ] PROFESSIONAL is redirected with the right toast
- [ ] PATIENT defense-in-depth works
- [ ] Unauthenticated boundary is owned by the layout
- [ ] RBAC at the action level rejects non-ADMIN
- [ ] Build + type-check + lint + tests are green
- [ ] No regressions in other dashboard sections

**Reviewer**: @_____________  **Date**: ____________
