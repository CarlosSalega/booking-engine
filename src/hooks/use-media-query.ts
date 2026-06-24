"use client";

/**
 * `useMediaQuery` — reactive CSS media query hook.
 *
 * Returns `true` when the media query matches the current viewport
 * and re-renders on change. SSR-safe: the initial render returns
 * `false` so Server Components don't see a "mobile" viewport that
 * was decided from the user agent string at request time.
 *
 * Used by the calendar popover to swap between the shadcn `Popover`
 * (desktop) and `Sheet` (mobile, ≤768px).
 */

import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  // `useSyncExternalStore` is the React-blessed way to subscribe to
  // a mutable external source without the cascading-render warning
  // that `useEffect` + `setState` triggers. The browser's
  // `matchMedia` API exposes a `change` event we can subscribe to.
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
      }
      return window.matchMedia(query).matches;
    },
    // Server snapshot — never matches on the server.
    () => false,
  );
}
