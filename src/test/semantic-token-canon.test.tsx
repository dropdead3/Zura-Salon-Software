import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { readIndexCss } from "@/test/css-rule";

/**
 * Semantic-token canon. The full shadcn cross-cutting token set — semantic
 * status (`destructive`, `success`, `warning`, `info`), core surfaces
 * (`background`, `foreground`, `card`, `popover`), interactive
 * (`primary`, `secondary`, `accent`, `muted`), and form/chrome
 * (`border`, `input`, `ring`) — is redefined by every theme. A raw hex or
 * rgba in a `--token` declaration would bypass the theme and break one or
 * more palettes (e.g. destructive red invisible on a red-heavy theme).
 *
 * The hex/rgba rule targets `--<token>` declarations specifically, not every
 * English occurrence of the word (CSS shorthand like `background: rgba(...)`
 * in a marketing-surface class is legitimately unrelated to `--background`).
 *
 * Parameterized: one set of assertions per token. Tokens absent from CSS are
 * skipped cleanly via `describe.skip`. Tokens absent from the Tailwind config
 * skip only the config assertion (first two still run).
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
] as const;

const indexCss = readIndexCss();
const tailwindConfig = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "tailwind.config.ts"),
  "utf8",
);

for (const token of TOKENS) {
  const declRe = new RegExp(`--${token}(-foreground)?\\s*:`);
  const existsInCss = declRe.test(indexCss);

  const configBlockRe = new RegExp(`${token}\\s*:\\s*\\{[^}]*\\}`);
  const configBlock = tailwindConfig.match(configBlockRe)?.[0];

  if (!existsInCss) {
    // Canon applies to tokens that exist. If neither CSS nor config define
    // it, skip the whole suite loudly so the reporter shows the intent.
    describe.skip(`semantic token canon: --${token} (not defined in index.css)`, () => {
      it("skipped", () => {});
    });
    continue;
  }

  describe(`semantic token canon: --${token}`, () => {
    it(`no raw hex or rgba literal in a --${token} declaration in index.css`, () => {
      // Scoped to `--${token}` (the custom-property prefix), not the bare
      // word — CSS shorthand like `background: rgba(...)` on an unthemed
      // marketing surface is unrelated to the `--background` token canon.
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

    it.skipIf(!configBlock)(
      `tailwind.config.ts routes ${token} through hsl(var(--${token}*))`,
      () => {
        if (!configBlock) {
          // eslint-disable-next-line no-console
          console.info(`[canon] --${token} has no block in tailwind.config.ts; skipping config assertion.`);
          return;
        }
        expect(configBlock).toContain(`hsl(var(--${token}))`);
        expect(configBlock).toContain(`hsl(var(--${token}-foreground))`);
        expect(configBlock).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        expect(configBlock).not.toMatch(/\brgba?\(\s*\d/);
      },
    );
  });
}
