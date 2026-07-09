/**
 * `AnalyticsError` — error boundary fallback with retry.
 *
 * Shown when the analytics Server Action fails. Renders an error
 * message in Spanish with a retry button that triggers a fresh
 * data fetch.
 *
 * Spec: ANP-010 (error state).
 */

"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AnalyticsErrorProps {
  onRetry: () => void;
}

export function AnalyticsError({ onRetry }: AnalyticsErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="analytics-error"
    >
      <div data-testid="analytics-error-icon" className="mb-4 rounded-full bg-destructive/10 p-4">
        <AlertCircle className="size-8 text-destructive" />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Error al cargar las analíticas. Intentá de nuevo.
      </p>
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
