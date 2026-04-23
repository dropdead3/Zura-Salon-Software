import { describe, it, expect } from "vitest";
import { readIndexCss, extractThemeSelectors, extractRuleBody } from "@/test/css-rule";

/**
 * Per-theme completeness canon (Step 2P). For each token family, every
 * theme selector that defines ANY token from the family must define ALL
 * tokens in that family.
 *
 * The "any → all" rule permits intentional inheritance (a theme may omit
 * a family entirely and inherit from `:root`) while catching forgetful
 * overrides (a theme that touches one chart token but forgets `--chart-3`).
 *
 * Family lists are explicit by design — auto-discovery from CSS would let
 * regressions sneak in via missing definitions.
 */

const FAMILIES: Record<string, string[]> = {
  semantic: [
    "destructive", "success", "warning", "info",
    "primary", "secondary", "accent", "muted",
    "card", "popover", "background", "foreground",
    "border", "input", "ring",
  ],
  chart: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
  sidebar: [
    "sidebar-background", "sidebar-foreground",
    "sidebar-primary", "sidebar-accent",
    "sidebar-border", "sidebar-ring",
  ],
};

const indexCss = readIndexCss();
const themeSelectors = extractThemeSelectors(indexCss);

for (const [familyName, tokens] of Object.entries(FAMILIES)) {
  // Filter the family to tokens actually defined somewhere in the CSS.
  // Tokens absent from every theme are out-of-scope (matches the
  // semantic-token-canon's `existsInCss` skip rule). Listing them in
  // FAMILIES still documents the intended set; the canon just doesn't
  // force a theme to define a token nobody else defines either.
  const presentTokens = tokens.filter((t) =>
    new RegExp(`--${t}\\s*:`).test(indexCss),
  );

  describe(`theme completeness canon: ${familyName} family`, () => {
    for (const selector of themeSelectors) {
      it(`${selector} — defines all-or-none of ${familyName} family`, () => {
        const body = extractRuleBody(indexCss, selector);
        if (!body) return;

        const defined = presentTokens.filter((t) =>
          new RegExp(`--${t}\\s*:`).test(body),
        );
        // Inheriting (defines none) is allowed.
        if (defined.length === 0) return;

        const missing = presentTokens.filter((t) => !defined.includes(t));
        expect(
          missing,
          `${selector} defines ${defined.length}/${presentTokens.length} ${familyName} tokens; missing: ${missing.join(", ")}`,
        ).toEqual([]);
      });
    }
  });
}
