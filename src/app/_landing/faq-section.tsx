"use client";

/**
 * FAQ section — accordion-based Q&A.
 *
 * Client Component because shadcn's `Accordion` requires Radix state.
 * Spec scenarios covered: LND-008 (FAQ Section) — single-open
 * accordion, 6-8 injectables Q&As.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSectionProps {
  items: readonly FaqItem[];
}

export function FaqSection({ items }: FaqSectionProps) {
  return (
    <section
      aria-labelledby="faq-heading"
      className="border-t border-border bg-background py-16 md:py-24"
    >
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 space-y-3 text-center md:mb-16">
          <h2
            id="faq-heading"
            className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            Preguntas frecuentes
          </h2>
          <p className="text-base text-muted-foreground md:text-lg">
            Las dudas más comunes sobre los tratamientos.
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>
                <p>{item.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
