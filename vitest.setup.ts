import "@testing-library/jest-dom/vitest";

// Provide a placeholder DATABASE_URL so that `import { prisma } from "@/lib/prisma"`
// does not throw at module load time. Tests that exercise Prisma must mock
// `@/lib/prisma` — the URL value itself is irrelevant in test runs.
if (!process.env["DATABASE_URL"]) {
  process.env["DATABASE_URL"] =
    "postgres://test:test@localhost:5432/test?sslmode=disable";
}

// jsdom does not implement pointer capture, but Radix UI (shadcn's
// Select, Popover, etc.) calls `hasPointerCapture` on every
// pointer-down event. Polyfill the relevant methods on `Element`
// so Radix handlers don't throw during user-event interactions.
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function hasPointerCapture() {
      return false;
    };
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function releasePointerCapture() {
      // no-op
    };
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function setPointerCapture() {
      // no-op
    };
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {
      // no-op
    };
  }
}

// jsdom does not implement `ResizeObserver`, but Radix UI's Switch
// (and other primitives) use `@radix-ui/react-use-size` to measure
// the root element. Provide a no-op polyfill so the component can
// mount without throwing — the returned size is never read in our
// tests, so an empty observation is fine.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {
      // no-op
    }
    unobserve() {
      // no-op
    }
    disconnect() {
      // no-op
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserverPolyfill;
}
