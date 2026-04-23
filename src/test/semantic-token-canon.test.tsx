import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { readIndexCss, findConfigReference } from "@/test/css-rule";

/**
 * Semantic-token canon. The full shadcn cross-cutting token set — semantic
 * status (`destructive`, `success`, `warning`, `info`), core surfaces
 * (`background`, `foreground`, `card`, `popover`), interactive
 * (`primary`, `secondary`, `accent`, `muted`), form/chrome
 * (`border`, `input`, `ring`), chart palette, and sidebar family —
 * is redefined by every theme. A raw hex or rgba in a `--token` declaration
 * would bypass the theme and break one or more palettes.
 *
 * The hex/rgba rule targets `--<token>` declarations specifically, not every
 * English occurrence of the word (CSS shorthand like `background: rgba(...)`
 * in a marketing-surface class is legitimately unrelated to `--background`).
 *
 * The config assertion uses shape-aware lookup (`findConfigReference`) so
 * flat blocks, flat strings, nested numbered (chart) and nested named
 * (sidebar) shapes all resolve cleanly. Foreground-pair assertion only runs
 * for tokens in `TOKENS_WITH_FOREGROUND` — others (border, chart, etc.)
 * have no foreground pair by design.
 */
const TOKENS = [
  // Semantic status
  "destructive", "success", "warning", "info",
  // Core surfaces
  "background", "foreground", "card", "popover",
  // Interactive
  "primary", "secondary", "accent", "muted",
  // Form/chrome
  "border", "input", "ring",
  // Chart palette
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
  // Sidebar family (Step 2N)
  "sidebar-background", "sidebar-foreground",
  "sidebar-primary", "sidebar-accent",
  "sidebar-border", "sidebar-ring",
] as const;

/**
 * Explicit allowlist: tokens that have a `--<token>-foreground` pair in CSS
 * AND a `foreground:` mapping in the Tailwind config. Anything outside this
 * set skips the foreground assertion by design (border/input/ring/chart-*
 * have no pair; background/foreground are themselves the pair).
 */
const TOKENS_WITH_FOREGROUND = new Set<string>([
  "destructive", "success", "warning", "info",
  "primary", "secondary", "accent", "muted",
  "card", "popover",
  "sidebar-primary", "sidebar-accent",
]);

const indexCss = readIndexCss();
const tailwindConfig = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "tailwind.config.ts"),
  "utf8",
);

for (const token of TOKENS) {
  const declRe = new RegExp(`--${token}(-foreground)?\\s*:`);
  const existsInCss = declRe.test(indexCss);
  const configRef = findConfigReference(tailwindConfig, token);

  if (!existsInCss) {
    describe.skip(`semantic token canon: --${token} (not defined in index.css)`, () => {
      it("skipped", () => {});
    });
    continue;
  }

  describe(`semantic token canon: --${token}`, () => {
    it(`no raw hex or rgba literal in a --${token} declaration in index.css`, () => {
      const hexOnLine = new RegExp(`--${token}(-foreground)?[^\\n;]*#[0-9a-fA-F]{3,8}\\b`);
      const rgbaOnLine = new RegExp(`--${token}(-foreground)?[^\\n;]*\\brgba?\\(\\s*\\d`);
      expect(indexCss).not.toMatch(hexOnLine);
      expect(indexCss).not.toMatch(rgbaOnLine);
    });

    it(`every --${token} declaration sits in a token-definition selector`, () => {
      const lines = indexCss.split("\n");
      const allowedSelectorRe = /(:root|\.dark|\[data-theme|\.theme-)/;
      const selectorRe = /^(\s*)([^\n{}]+)\{\s*$/;
      const declLineRe = new RegExp(`--${token}(-foreground)?\\s*:`);

      const violations: { line: number; selector: string }[] = [];
      let currentSelector = "";
      lines.forEach((line, idx) => {
        const m = line.match(selectorRe);
        if (m) currentSelector = m[2].trim();
        if (declLineRe.test(line) && !allowedSelectorRe.test(currentSelector)) {
          violations.push({ line: idx + 1, selector: currentSelector });
        }
      });
      expect(
        violations,
        `--${token} declared outside token block:\n${JSON.stringify(violations, null, 2)}`,
      ).toEqual([]);
    });

    it.skipIf(!configRef)(
      `tailwind.config.ts routes ${token} through hsl(var(--${token}))`,
      () => {
        if (!configRef) return;
        expect(configRef).toContain(`hsl(var(--${token}))`);
        if (TOKENS_WITH_FOREGROUND.has(token)) {
          expect(configRef).toContain(`hsl(var(--${token}-foreground))`);
        }
        expect(configRef).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        expect(configRef).not.toMatch(/\brgba?\(\s*\d/);
      },
    );
  });
}
