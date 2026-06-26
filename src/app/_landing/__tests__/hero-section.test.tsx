/**
 * Tests for the `HeroSection` Server Component.
 *
 * The hero is the first thing a visitor sees. It must:
 *   - Render the doctor's name in a single `<h1>` (LND-002 / LND-003).
 *   - Show the professional title and tagline.
 *   - Render a CTA that scrolls to the `#booking` anchor (LND-003).
 *   - Render a `next/image` with an `alt` attribute for accessibility.
 *
 * Spec scenario: `landing-public` LND-003 (Hero Section) — every WHEN/THEN
 * clause maps to one assertion below.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { HeroSection } from "../hero-section";

const defaultProps = {
  name: "Dra. Alejandra Pasqualetti",
  title: "Medicina estética facial",
  tagline:
    "Tratamientos de inyectables faciales con resultados naturales, seguros y personalizados.",
  ctaText: "Agendar turno",
  imageSrc: "/placeholder.webp",
  imageAlt: "Retrato de la doctora en consultorio",
};

describe("HeroSection — content rendering", () => {
  it("renders the doctor's full name in a single <h1> (LND-002 single h1)", () => {
    render(<HeroSection {...defaultProps} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Dra. Alejandra Pasqualetti");
  });

  it("renders the title in a <p>", () => {
    render(<HeroSection {...defaultProps} />);
    expect(screen.getByText("Medicina estética facial")).toBeInTheDocument();
  });

  it("renders the tagline in a <p>", () => {
    render(<HeroSection {...defaultProps} />);
    expect(
      screen.getByText(/tratamientos de inyectables faciales/i),
    ).toBeInTheDocument();
  });
});

describe("HeroSection — CTA scrolls to booking", () => {
  it("renders an anchor with href='#booking' and the CTA label", () => {
    render(<HeroSection {...defaultProps} />);
    const cta = screen.getByRole("link", { name: /agendar turno/i });
    expect(cta).toHaveAttribute("href", "#booking");
  });
});

describe("HeroSection — image accessibility", () => {
  it("renders the next/image with a non-empty alt text", () => {
    render(<HeroSection {...defaultProps} />);
    // next/image renders an <img> for the actual visual element.
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "Retrato de la doctora en consultorio");
  });
});
