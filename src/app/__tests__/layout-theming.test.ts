/**
 * Source-level tests for the root layout (`src/app/layout.tsx`) and
 * the cross-cutting "no invalid `hsl(var(--*))` references" rule.
 *
 * These tests intentionally bypass React rendering and read the source
 * files directly — they pin the *contract* the rest of the codebase
 * depends on:
 *
 *   - The Toaster's inline style uses `var(--card/foreground/border)`
 *     directly — never `hsl(var(--...))`, which is invalid CSS for
 *     `oklch()` tokens (ui-feedback spec, "Toaster uses valid token
 *     references" scenario).
 *   - Across `src/`, zero occurrences of `hsl(var(--` remain in
 *     production files (ui-feedback spec, "No hsl(var(...)) remains
 *     in source" scenario).
 *
 * Source-grep tests like these are explicitly allowed by the
 * slice-2 design (`-r source-grep test` in tasks 3.3 + 3.10).
 */

import { beforeAll, describe, expect, it } from "vitest";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SRC_ROOT = "src";

/** Recursively collect every `.ts` and `.tsx` file under `src/`. */
async function collectSourceFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir)) {
    // Skip test directories so the grep is scoped to production code.
    if (entry === "__tests__") continue;
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) {
      out.push(...(await collectSourceFiles(full)));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3.3 + 3.4 — Toaster style uses var(--*) (never hsl(var(--*)))
// ---------------------------------------------------------------------------

describe("RootLayout Toaster style — var(--*) references, not hsl(var(--))", () => {
  let source = "";

  beforeAll(async () => {
    source = await readFile("src/app/layout.tsx", "utf-8");
  });

  it("uses var(--card) for the Toaster background", () => {
    expect(source).toMatch(/background:\s*"var\(--card\)"/);
  });

  it("uses var(--foreground) for the Toaster text color", () => {
    expect(source).toMatch(/color:\s*"var\(--foreground\)"/);
  });

  it("uses '1px solid var(--border)' for the Toaster border", () => {
    expect(source).toMatch(/border:\s*"1px solid var\(--border\)"/);
  });

  it("does NOT wrap any CSS custom property in hsl() (oklch tokens are invalid inside hsl())", () => {
    expect(source).not.toMatch(/hsl\(\s*var\(--/);
  });
});

// ---------------------------------------------------------------------------
// 3.10 + ui-feedback spec — `hsl(var(--` MUST be gone from production src/
// ---------------------------------------------------------------------------

describe("Production source — no hsl(var(--...) anywhere in src/", () => {
  it("finds zero matches for 'hsl(var(--' across production .ts/.tsx files", async () => {
    const files = await collectSourceFiles(SRC_ROOT);
    const offenders: Array<{ path: string; line: number; text: string }> = [];

    for (const path of files) {
      const content = await readFile(path, "utf-8");
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (line.includes("hsl(var(--")) {
          offenders.push({ path, line: i + 1, text: line.trim() });
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
