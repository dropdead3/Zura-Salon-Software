import { describe, it, expect } from "vitest";
import {
  readIndexCss,
  extractRuleBody,
  extractThemeSelectors,
  extractDefinedTokens,
} from "@/test/css-rule";

/**
 * Cross-theme parity canon (Step 2R). Every theme selector that defines
 * design-token state must define the same color-token surface as the
 * baseline theme (`.theme-bone`, the default applied to `<html>`).
 *
 * Why `.theme-bone` and not `:root`: this codebase's `:root` blocks only
 * declare animation and elevation primitives — the design-token baseline
 * lives in `.theme-bone` (the "Cream Editorial Luxury" default per the
 * file header). Treating `.theme-bone` as the baseline matches how the
 * runtime actually resolves tokens.
 *
 * Why split BASELINE_ONLY_TOKENS out: typography (font-size-*, leading-*,
 * tracking-*, font-weight-*) and radius primitives are theme-invariant
 * by design — declared once in `.theme-bone`, inherited everywhere. They
 * shouldn't trigger parity failures. This is structural, not a per-theme
 * exception, so it lives in the test rather than in ALLOWLIST_OMISSIONS.
 *
 * ALLOWLIST_OMISSIONS is for the genuinely per-theme case (e.g., a print
 * theme that has no sidebar). Empty by default — entries get added with a
 * comment explaining why a specific theme legitimately omits a token.
 */

const BASELINE_THEME = ".theme-bone";

/**
 * Tokens defined only in the baseline theme by structural intent. Typography,
 * weight, leading, tracking, and radius are theme-invariant — themes change
 * color, not type scale.
 */
const BASELINE_ONLY_TOKENS = new Set<string>([
  "font-size-xs", "font-size-sm", "font-size-base", "font-size-lg",
  "font-size-xl", "font-size-2xl", "font-size-3xl", "font-size-4xl",
  "font-weight-normal", "font-weight-medium", "font-weight-semibold", "font-weight-bold",
  "leading-none", "leading-tight", "leading-snug", "leading-normal",
  "leading-relaxed", "leading-loose",
  "tracking-tighter", "tracking-tight", "tracking-normal",
  "tracking-wide", "tracking-wider", "tracking-widest", "tracking-display",
  "radius",
]);

/**
 * Per-theme decorative tokens that MAY appear in any theme without parity
 * implications — they're optional theme accents, not part of the canonical
 * color surface. Distinct from BASELINE_ONLY_TOKENS (which are baseline-only)
 * and ALLOWLIST_OMISSIONS (which are per-theme exceptions).
 */
const DECORATIVE_OPTIONAL_TOKENS = new Set<string>([
  "mesh-gradient", // background-image accent, defined per-theme in html.theme-* blocks
]);

/**
 * Per-theme deliberate omissions of color tokens. Empty by default —
 * the strictest starting position. Entries get added with a one-line
 * comment naming the reason.
 */
const ALLOWLIST_OMISSIONS: Record<string, string[]> = {
  // Example: ".theme-print": ["sidebar-background"], // print has no sidebar
};

const indexCss = readIndexCss();
const baselineBody = extractRuleBody(indexCss, BASELINE_THEME) ?? "";
const baselineTokens = new Set(extractDefinedTokens(baselineBody));
const baselineColorTokens = new Set(
  [...baselineTokens].filter(
    (t) => !BASELINE_ONLY_TOKENS.has(t) && !DECORATIVE_OPTIONAL_TOKENS.has(t),
  ),
);

// Only theme-defining selectors that actually declare ≥1 color token.
// Filters out:
//   - descendant utility selectors (`.dark .hover-lift`) that match the
//     theme regex but aren't theme blocks
//   - decorative-gradient blocks (`html.theme-*`) that only declare
//     `--mesh-gradient` — structurally distinct from color theme blocks
const themeSelectors = extractThemeSelectors(indexCss).filter((sel) => {
  if (sel === BASELINE_THEME) return false;
  const body = extractRuleBody(indexCss, sel);
  if (!body) return false;
  const declared = extractDefinedTokens(body);
  const colorTokens = declared.filter(
    (t) => !DECORATIVE_OPTIONAL_TOKENS.has(t),
  );
  return colorTokens.length > 0;
});

for (const selector of themeSelectors) {
  describe(`cross-theme parity canon: ${selector}`, () => {
    const body = extractRuleBody(indexCss, selector) ?? "";
    const themeTokens = new Set(extractDefinedTokens(body));
    const allowed = new Set(ALLOWLIST_OMISSIONS[selector] ?? []);

    it("defines every color token the baseline theme defines", () => {
      const missing = [...baselineColorTokens]
        .filter((t) => !themeTokens.has(t))
        .filter((t) => !allowed.has(t))
        .sort();
      expect(
        missing,
        `${selector} missing color tokens defined by ${BASELINE_THEME}: ${missing.join(", ")}`,
      ).toEqual([]);
    });

    it("introduces no tokens unknown to the baseline theme", () => {
      const extras = [...themeTokens]
        .filter((t) => !baselineTokens.has(t))
        .filter((t) => !DECORATIVE_OPTIONAL_TOKENS.has(t))
        .sort();
      expect(
        extras,
        `${selector} defines tokens not in ${BASELINE_THEME}: ${extras.join(", ")}`,
      ).toEqual([]);
    });
  });
}
