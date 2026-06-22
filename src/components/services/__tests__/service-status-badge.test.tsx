/**
 * Tests for the `ServiceStatusBadge` Client Component.
 *
 * Mirrors the patients `PatientStatusBadge` test strategy: render
 * the component with @testing-library/react and assert the rendered
 * label + the badge variant prop. The component is small enough
 * that we can render it directly without mocking — no Next.js
 * router, no auth, no Prisma.
 *
 * The test covers all 2 ServiceStatus values + a snapshot of the
 * expected variant map. The variant is exported as a constant so
 * consumers (e.g. the table) can reference it directly.
 *
 * Spec scenarios covered (from
 * `openspec/changes/services/specs/services-domain/spec.md`):
 * - `services-list` — Status badge: Activo (green), Inactivo (gray).
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ServiceStatus, type ServiceStatusType } from "@/modules/services/domain/service";

import {
  ServiceStatusBadge,
  SERVICE_STATUS_BADGE_VARIANT,
} from "@/components/services/service-status-badge";

// ---------------------------------------------------------------------------
// SERVICE_STATUS_BADGE_VARIANT — the variant map
// ---------------------------------------------------------------------------

describe("SERVICE_STATUS_BADGE_VARIANT", () => {
  it("maps ACTIVE → default (green in app CSS)", () => {
    expect(SERVICE_STATUS_BADGE_VARIANT[ServiceStatus.ACTIVE]).toBe("default");
  });

  it("maps INACTIVE → secondary (gray in app CSS)", () => {
    expect(SERVICE_STATUS_BADGE_VARIANT[ServiceStatus.INACTIVE]).toBe(
      "secondary",
    );
  });

  it("covers all 2 ServiceStatus values (exhaustive)", () => {
    const all: ServiceStatusType[] = [
      ServiceStatus.ACTIVE,
      ServiceStatus.INACTIVE,
    ];
    for (const status of all) {
      expect(SERVICE_STATUS_BADGE_VARIANT[status]).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// ServiceStatusBadge — renders the correct label
// ---------------------------------------------------------------------------

describe("ServiceStatusBadge", () => {
  it("renders the Spanish label 'Activo' for ACTIVE", () => {
    render(<ServiceStatusBadge status={ServiceStatus.ACTIVE} />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("renders the Spanish label 'Inactivo' for INACTIVE", () => {
    render(<ServiceStatusBadge status={ServiceStatus.INACTIVE} />);
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("renders a default-variant badge for ACTIVE (green)", () => {
    render(<ServiceStatusBadge status={ServiceStatus.ACTIVE} />);
    const badge = screen.getByText("Activo");
    expect(badge).toHaveAttribute("data-variant", "default");
  });

  it("renders a secondary-variant badge for INACTIVE (gray)", () => {
    render(<ServiceStatusBadge status={ServiceStatus.INACTIVE} />);
    const badge = screen.getByText("Inactivo");
    expect(badge).toHaveAttribute("data-variant", "secondary");
  });
});
