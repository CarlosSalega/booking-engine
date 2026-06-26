"use client";

/**
 * Floating WhatsApp button — fixed bottom-right CTA, visible on all
 * screen sizes. Pulses on first mount to draw attention (LND-009).
 *
 * Touch target: `w-14 h-14` = 56×56px, ≥44×44px (LND-010).
 */

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

export interface FloatingWhatsAppProps {
  phoneNumber: string;
  message: string;
}

export function FloatingWhatsApp({
  phoneNumber,
  message,
}: FloatingWhatsAppProps) {
  // Start in the pulsing state so the effect doesn't need a synchronous
  // setState call (which the React Compiler flags as a cascading-render
  // anti-pattern). The effect only schedules the timer to flip it off.
  const [pulsing, setPulsing] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setPulsing(false), 2000);
    return () => window.clearTimeout(id);
  }, []);

  const href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-colors hover:bg-green-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-500/40"
    >
      {pulsing ? (
        <span
          aria-hidden="true"
          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"
        />
      ) : null}
      <MessageCircle aria-hidden="true" className="relative size-7" />
    </a>
  );
}
