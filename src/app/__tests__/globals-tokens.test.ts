/**
 * Source-level tests for the design-token contract enforced by the
 * theme stylesheet (`src/app/globals.css`).
 *
 * These tests intentionally bypass React rendering and read the source
 * file directly — they pin the *contract* the rest of the codebase
 * depends on:
 *
 *   - The four `--status-*` tokens added by slice 2 are defined in
 *     `:root`, `.dark`, and the `@theme inline` `--color-*` block
 *     (token contract per `openspec/changes/ux-audit-fixes/specs/calendar-view`
 *     + `ui-feedback`).
 *   - The `--whatsapp` / `--whatsapp-hover` brand pair is defined in
 *     the same three places (landing-public spec).
 *
 * Source-grep tests like these are explicitly allowed by the
 * slice-2 design (`-r source-grep test` in tasks 3.1 / 3.2) and match
 * the existing pattern in `calendar.test.tsx`'s "declares 'use client'
 * on the first line" check.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Slice `globals.css` into the three authoritative blocks:
 *   - `:root { ... }`
 *   - `.dark { ... }`
 *   - `@theme inline { ... }`
 *
 * The slice is the substring between the opening `{` and its matching
 * closing `}`. We don't try to fully parse CSS — we only need the
 * block contents to assert that a token name appears somewhere inside.
 */
function sliceBlock(source: string, header: string): string {
  const start = source.indexOf(header);
  if (start < 0) return "";
  const open = source.indexOf("{", start);
  if (open < 0) return "";
  let depth = 1;
  let i = open + 1;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    i += 1;
  }
  return depth === 0 ? source.slice(open + 1, i - 1) : "";
}

// ---------------------------------------------------------------------------
// 3.1 — `--status-awaiting-payment`, `--status-in-process`,
//       `--status-rejected`, `--status-rescheduled`
// ---------------------------------------------------------------------------

describe("globals.css — missing --status-* tokens added by slice 2", () => {
  let css = "";
  let rootBlock = "";
  let darkBlock = "";
  let themeBlock = "";

  // Read once for the whole describe — `globals.css` doesn't change
  // inside a single Vitest run.
  beforeAll(async () => {
    css = await readFile("src/app/globals.css", "utf-8");
    rootBlock = sliceBlock(css, ":root");
    darkBlock = sliceBlock(css, ".dark");
    themeBlock = sliceBlock(css, "@theme inline");
  });

  const NEW_TOKENS = [
    "--status-awaiting-payment",
    "--status-in-process",
    "--status-rejected",
    "--status-rescheduled",
  ] as const;

  for (const token of NEW_TOKENS) {
    it(`defines ${token} in :root`, () => {
      expect(rootBlock).toContain(token);
    });

    it(`defines ${token} in .dark`, () => {
      expect(darkBlock).toContain(token);
    });

    it(`defines --color-${token.slice(2)} in @theme inline`, () => {
      // `--status-awaiting-payment` → `--color-status-awaiting-payment`
      expect(themeBlock).toContain(`--color-${token.slice(2)}`);
    });
  }

  it("preserves the existing 5 --status-* tokens (regression guard)", () => {
    const preExisting = [
      "--status-confirmed",
      "--status-pending",
      "--status-cancelled",
      "--status-no-show",
      "--status-completed",
    ];
    for (const token of preExisting) {
      expect(rootBlock).toContain(token);
      expect(darkBlock).toContain(token);
      expect(themeBlock).toContain(`--color-${token.slice(2)}`);
    }
  });
});

// ---------------------------------------------------------------------------
// 3.2 — `--whatsapp`, `--whatsapp-hover` brand token pair
// ---------------------------------------------------------------------------

describe("globals.css -- WhatsApp brand token pair (slice 2)", () => {
  let css = "";
  let rootBlock = "";
  let darkBlock = "";
  let themeBlock = "";

  beforeAll(async () => {
    css = await readFile("src/app/globals.css", "utf-8");
    rootBlock = sliceBlock(css, ":root");
    darkBlock = sliceBlock(css, ".dark");
    themeBlock = sliceBlock(css, "@theme inline");
  });

  it("defines --whatsapp in :root with an oklch() value", () => {
    expect(rootBlock).toMatch(/--whatsapp:\s*oklch\(/);
  });

  it("defines --whatsapp-hover in :root with an oklch() value", () => {
    expect(rootBlock).toMatch(/--whatsapp-hover:\s*oklch\(/);
  });

  it("defines --whatsapp in .dark with a (possibly different) oklch() value", () => {
    expect(darkBlock).toMatch(/--whatsapp:\s*oklch\(/);
  });

  it("defines --whatsapp-hover in .dark with a (possibly different) oklch() value", () => {
    expect(darkBlock).toMatch(/--whatsapp-hover:\s*oklch\(/);
  });

  it("exposes --color-whatsapp and --color-whatsapp-hover via @theme inline", () => {
    expect(themeBlock).toContain("--color-whatsapp");
    expect(themeBlock).toContain("--color-whatsapp-hover");
  });
});