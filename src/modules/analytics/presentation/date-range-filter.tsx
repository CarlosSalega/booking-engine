/**
 * `DateRangeFilter` — Client Component for date range selection.
 *
 * Renders preset buttons (7d, 30d, 3mo, 6mo, custom) and optional
 * custom date inputs. Updates URL searchParams via `router.replace`
 * so analytics are bookmarkable and survive page refresh.
 *
 * Uses `useTransition + useState` per project convention (not
 * `useActionState`). The `pending` state from `useTransition`
 * provides instant visual feedback while the server re-fetches.
 *
 * Spec: ANP-002 (DateRangeFilter).
 * Design: URL searchParams vs React state — searchParams win.
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Preset definitions — mirrors domain constants but UI-specific labels.
// ---------------------------------------------------------------------------

const PRESETS = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "3mo", label: "3 meses" },
  { value: "6mo", label: "6 meses" },
] as const;

type PresetValue = (typeof PRESETS)[number]["value"];

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePreset = searchParams.get("preset") as PresetValue | "custom" | null;

  // Track custom mode locally so the UI responds instantly (before URL syncs).
  const [showCustom, setShowCustom] = useState(activePreset === "custom");

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function updateParams(params: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      next.set(key, value);
    }
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }

  function handlePresetClick(preset: PresetValue) {
    setError(null);
    setShowCustom(false);
    updateParams({ preset });
  }

  function handleCustomClick() {
    setError(null);
    setShowCustom(true);
    updateParams({ preset: "custom" });
  }

  function handleCustomSubmit() {
    if (!from || !to) {
      setError("Completá ambas fechas");
      return;
    }
    if (from >= to) {
      setError("La fecha desde debe ser anterior a hasta");
      return;
    }
    setError(null);
    updateParams({ preset: "custom", from, to });
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4" data-testid="date-range-filter">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(({ value, label }) => (
          <Button
            key={value}
            variant={!showCustom && activePreset === value ? "default" : "outline"}
            size="sm"
            data-state={!showCustom && activePreset === value ? "active" : "inactive"}
            disabled={isPending}
            onClick={() => handlePresetClick(value)}
          >
            {label}
          </Button>
        ))}
        <Button
          variant={showCustom ? "default" : "outline"}
          size="sm"
          data-state={showCustom ? "active" : "inactive"}
          disabled={isPending}
          onClick={handleCustomClick}
        >
          Personalizado
        </Button>
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="date-from" className="text-sm font-medium">Desde</label>
            <Input
              id="date-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="date-to" className="text-sm font-medium">Hasta</label>
            <Input
              id="date-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
          <Button size="sm" disabled={isPending} onClick={handleCustomSubmit}>
            Aplicar
          </Button>
        </div>
      )}

      {/* Validation error */}
      {error && (
        <p className="text-sm text-destructive" data-testid="date-range-error">
          {error}
        </p>
      )}
    </div>
  );
}
