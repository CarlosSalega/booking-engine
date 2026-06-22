/**
 * `ServiceSearchBar` — debounced text search for the services list.
 *
 * Updates the URL's `?search=...` parameter via `router.push`, which
 * triggers a Server Component re-render of the services page. The
 * debounce keeps the URL from updating on every keystroke.
 *
 * Mirrors the patients `PatientSearchBar` pattern: source of truth
 * is the URL, we mirror it into local state for input control, and
 * a 300ms debounce commits the change. The search filter on the
 * data layer (`getServices`) does a case-insensitive contains
 * match against the service's `name` AND `description`, so a
 * single text input covers both fields without an explicit
 * "search by" selector.
 *
 * UX: the input shows the current `?search=` value. Pressing
 * Enter or waiting 300ms after the last keystroke commits the
 * value to the URL. The "Limpiar" button resets the search.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DEBOUNCE_MS = 300;

export function ServiceSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlSearch = searchParams.get("search") ?? "";
  const [value, setValue] = useState(urlSearch);
  const lastUrlRef = useRef(urlSearch);

  if (lastUrlRef.current !== urlSearch) {
    lastUrlRef.current = urlSearch;
    setValue(urlSearch);
  }

  // Debounced commit to URL — fires 300ms after the user stops typing.
  useEffect(() => {
    if (value === urlSearch) return; // nothing to do
    const handle = setTimeout(() => {
      commitSearch(value);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // We intentionally exclude `urlSearch` from deps to avoid loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commitSearch(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim().length === 0) {
      params.delete("search");
    } else {
      params.set("search", next.trim());
    }
    // Reset pagination when the search changes.
    params.delete("page");
    const query = params.toString();
    router.push(
      query ? `/dashboard/services?${query}` : "/dashboard/services",
    );
  }

  function handleClear() {
    setValue("");
    commitSearch("");
  }

  return (
    <form
      role="search"
      className="relative flex w-full items-center gap-2 sm:max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        commitSearch(value);
      }}
    >
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        inputMode="search"
        placeholder="Buscar por nombre o descripción…"
        aria-label="Buscar servicios"
        className="pl-8 pr-8"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        name="search"
      />
      {value.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </form>
  );
}
