/**
 * Tests for the `FaqSection` Client Component.
 *
 * The FAQ is built on shadcn `Accordion` with `type="single" collapsible`
 * (LND-008):
 *   - All items are collapsed initially.
 *   - Clicking a question expands the answer.
 *   - Opening item B closes item A (single-open semantic).
 *   - Answers are 2-4 sentences (per spec).
 *
 * Spec scenario: `landing-public` LND-008 (FAQ Section).
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FaqSection } from "../faq-section";

const items = [
  {
    question: "¿Los tratamientos son dolorosos?",
    answer:
      "La mayoría se tolera muy bien. Uso anestesia tópica en crema cuando el área lo requiere y agujas muy finas. La sesión completa dura entre 30 y 60 minutos y la molestia es leve.",
  },
  {
    question: "¿Cuánto duran los resultados?",
    answer:
      "La toxina botulínica dura entre 4 y 6 meses. El ácido hialurónico entre 9 y 18 meses según la zona y el producto. Los bioestimuladores trabajan durante 2-3 meses y el resultado se mantiene hasta 2 años.",
  },
  {
    question: "¿Cuándo veo los resultados?",
    answer:
      "La toxina se empieza a notar a los 3 días y se asienta a la semana. El ácido hialurónico se ve de inmediato aunque el resultado final se aprecia a los 15 días. Los bioestimuladores son progresivos y llegan a su punto óptimo al tercer mes.",
  },
];

describe("FaqSection — content rendering", () => {
  it("renders every question as an accordion trigger", () => {
    render(<FaqSection items={items} />);
    for (const item of items) {
      expect(
        screen.getByRole("button", { name: item.question }),
      ).toBeInTheDocument();
    }
  });

  it("keeps all answers collapsed by default (LND-008: all closed initially)", () => {
    render(<FaqSection items={items} />);
    for (const item of items) {
      // Radix Accordion sets data-state="closed" on triggers until
      // expanded. We assert the trigger itself is collapsed.
      const trigger = screen.getByRole("button", { name: item.question });
      expect(trigger.getAttribute("data-state")).toBe("closed");
    }
  });
});

describe("FaqSection — single-open accordion", () => {
  it("expands an answer when the user clicks the question", async () => {
    const user = userEvent.setup();
    render(<FaqSection items={items} />);
    const firstTrigger = screen.getByRole("button", {
      name: items[0]!.question,
    });
    await user.click(firstTrigger);
    expect(firstTrigger.getAttribute("data-state")).toBe("open");
    // The answer is now in the document (Radix renders it as a region
    // with role="region" when expanded).
    expect(
      screen.getByText(/mayoría se tolera muy bien/i),
    ).toBeInTheDocument();
  });

  it("collapses the first item when the user opens the second (single-open)", async () => {
    const user = userEvent.setup();
    render(<FaqSection items={items} />);

    const first = screen.getByRole("button", { name: items[0]!.question });
    const second = screen.getByRole("button", { name: items[1]!.question });

    await user.click(first);
    expect(first.getAttribute("data-state")).toBe("open");

    await user.click(second);
    // First is now closed; second is open.
    expect(first.getAttribute("data-state")).toBe("closed");
    expect(second.getAttribute("data-state")).toBe("open");
  });
});
