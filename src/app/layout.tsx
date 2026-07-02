import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

import { TooltipProvider } from "@/components/ui/tooltip";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  // Default metadata — overridden by `generateMetadata()` in
  // `src/app/page.tsx` for the public landing. Kept as a sensible
  // fallback for the rest of the app (login, dashboard, etc.).
  title: {
    default: "Booking Engine",
    template: "%s · Booking Engine",
  },
  description: "Plataforma de reservas y gestión para consultorios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
        <Suspense>
          <TooltipProvider>{children}</TooltipProvider>
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
            },
          }}
        />
      </body>
    </html>
  );
}
