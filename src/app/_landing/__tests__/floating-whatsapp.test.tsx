/**
 * Tests for the `FloatingWhatsApp` landing-public CTA.
 *
 * The component renders a fixed bottom-right floating anchor that
 * opens a pre-filled WhatsApp conversation. Spec contracts
 * (`landing-public` spec / LND-009 + slice-2 design):
 *   - `href` opens WhatsApp with the pre-filled message
 *   - `aria-label="Contactar por WhatsApp"` (Spanish)
 *   - Background uses the `--whatsapp` brand token (NOT raw
 *     `green-500` / `green-600` Tailwind palette classes)
 *   - Hover uses the `--whatsapp-hover` brand token
 *   - Visible focus ring via `focus-visible:ring-*`
 *   - Mount-ping span shares the brand token
 *   - Touch target ≥44×44 (LND-010, `w-14 h-14` = 56×56px)
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FloatingWhatsApp } from "../floating-whatsapp";

const DEFAULT_PROPS = {
  phoneNumber: "5491100000000",
  message: "Hola, quiero reservar un turno.",
};

describe("FloatingWhatsApp — link + a11y wiring", () => {
  it("renders an <a> with the WhatsApp deep-link href (pre-filled message)", () => {
    render(<FloatingWhatsApp {...DEFAULT_PROPS} />);
    const link = screen.getByRole("link", { name: /contactar por whatsapp/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toContain(
      `https://wa.me/${DEFAULT_PROPS.phoneNumber}`,
    );
    expect(link.getAttribute("href")).toContain(
      encodeURIComponent(DEFAULT_PROPS.message),
    );
  });

  it("opens in a new tab safely (target=_blank + rel=noopener noreferrer)", () => {
    render(<FloatingWhatsApp {...DEFAULT_PROPS} />);
    const link = screen.getByRole("link", { name: /contactar por whatsapp/i });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("renders the Spanish aria-label 'Contactar por WhatsApp'", () => {
    render(<FloatingWhatsApp {...DEFAULT_PROPS} />);
    expect(
      screen.getByRole("link", { name: "Contactar por WhatsApp" }),
    ).toBeInTheDocument();
  });

  it("renders the lucide MessageCircle icon", () => {
    const { container } = render(<FloatingWhatsApp {...DEFAULT_PROPS} />);
    const link = screen.getByRole("link", { name: /contactar por whatsapp/i });
    const svg = link.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("class") ?? "").toContain("lucide-message-circle");
  });

  it("renders a ≥44×44 touch target (w-14 h-14)", () => {
    render(<FloatingWhatsApp {...DEFAULT_PROPS} />);
    const link = screen.getByRole("link", { name: /contactar por whatsapp/i });
    expect(link.className).toContain("h-14");
    expect(link.className).toContain("w-14");
  });
});

describe("FloatingWhatsApp — slice-2 brand token wiring", () => {
  it("uses bg-whatsapp on the anchor (NOT raw green-500/green-600)", () => {
    render(<FloatingWhatsApp {...DEFAULT_PROPS} />);
    const link = screen.getByRole("link", { name: /contactar por whatsapp/i });
    expect(link.className).toContain("bg-whatsapp");
    expect(link.className).not.toContain("green-500");
    expect(link.className).not.toContain("green-600");
  });

  it("uses hover:bg-whatsapp-hover on the anchor", () => {
    render(<FloatingWhatsApp {...DEFAULT_PROPS} />);
    const link = screen.getByRole("link", { name: /contactar por whatsapp/i });
    expect(link.className).toContain("hover:bg-whatsapp-hover");
  });

  it("renders a visible focus ring via focus-visible:ring-*", () => {
    render(<FloatingWhatsApp {...DEFAULT_PROPS} />);
    const link = screen.getByRole("link", { name: /contactar por whatsapp/i });
    expect(link.className).toMatch(/focus-visible:ring-/);
    expect(link.className).toContain("focus-visible:ring-whatsapp");
  });

  it("uses bg-whatsapp on the mount-ping span (no raw green-500)", () => {
    const { container } = render(<FloatingWhatsApp {...DEFAULT_PROPS} />);
    // The ping span is `aria-hidden` and only renders while `pulsing`
    // is true. The component starts in the pulsing state, so it must
    // be in the document on first render.
    const html = container.innerHTML;
    // The ping span is the only animate-ping element.
    expect(html).toContain("animate-ping");
    expect(html).toContain("bg-whatsapp");
    expect(html).not.toMatch(/animate-ping[^"]*bg-green-/);
  });
});