import { describe, it, expect } from "vitest";
import {
  readIndexCss,
  extractRuleBody,
  extractThemeSelectors,
  extractDefinedTokens,
} from "@/test/css-rule";

/**
 * Cross-theme parity canon (Step 2R + 2T). Every theme selector that defines
 * design-token state must define the same color-token surface as the
 * baseline theme (`.theme-bone`, the default applied to `<html>`).
 *
 * Step 2T graduated `--mesh-gradient` from "decorative-optional" to a
 * first-class baseline token. Gradient tokens live in `html.theme-*` blocks
 * (higher CSS specificity than `.theme-*` color blocks). The canon now
 * merges co-applied selectors — `.theme-bone` + `html.theme-bone` — into a
 * single token surface because runtime resolves both against the same
 * `<html class="theme-bone">` element.
 *
 * Why `.theme-bone` and not `:root`: `:root` blocks here only declare
 * animation and elevation primitives — the design-token baseline lives in
 * `.theme-bone` (the "Cream Editorial Luxury" default per the file header).
 *
 * Why split BASELINE_ONLY_TOKENS out: typography (font-size-*, leading-*,
 * tracking-*, font-weight-*) and radius primitives are theme-invariant
 * by design — declared once in `.theme-bone`, inherited everywhere.
 *
 * ALLOWLIST_OMISSIONS is for the genuinely per-theme case (e.g., a print
 * theme that has no sidebar). Empty by default.
 */

const BASELINE_THEME_NAME = "bone";
const BASELINE_COLOR_SELECTOR = `.theme-${BASELINE_THEME_NAME}`;
const BASELINE_GRADIENT_SELECTOR = `html.theme-${BASELINE_THEME_NAME}`;

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
 * Per-theme deliberate omissions of color tokens. Empty by default.
 * Entries get added with a one-line comment naming the reason.
 */
const ALLOWLIST_OMISSIONS: Record<string, string[]> = {
  // Example: ".theme-print": ["sidebar-background"], // print has no sidebar
};

/**
 * Selectors that match the theme-selector regex but exist for non-color
 * primitive plumbing (animation multipliers, dark-mode elevation overrides).
 * They're structurally not "themes" and shouldn't be parity-checked.
 */
const STRUCTURAL_NON_THEME_SELECTORS = new Set<string>([
  ":root",  // animation + elevation primitives only
  ".dark",  // dark-mode elevation overrides only
]);

const indexCss = readIndexCss();

/**
 * Returns the merged token set for a theme, unioning the color selector
 * (`.theme-name`) and the gradient selector (`html.theme-name`). Mirrors
 * runtime: both selectors apply to the same `<html class="theme-name">`.
 */
function mergedThemeTokens(themeName: string): Set<string> {
  const colorBody = extractRuleBody(indexCss, `.theme-${themeName}`) ?? "";
  const gradientBody = extractRuleBody(indexCss, `html.theme-${themeName}`) ?? "";
  return new Set([
    ...extractDefinedTokens(colorBody),
    ...extractDefinedTokens(gradientBody),
  ]);
}

const baselineTokens = mergedThemeTokens(BASELINE_THEME_NAME);
const baselineColorTokens = new Set(
  [...baselineTokens].filter((t) => !BASELINE_ONLY_TOKENS.has(t)),
);

/**
 * Theme selectors to assert. We collect distinct theme *names* from both
 * `.theme-*` and `html.theme-*` shapes (deduplicated), then run parity on
 * each name's merged surface. Filters out:
 *   - the baseline itself
 *   - structural primitives (`:root`, `.dark`)
 *   - dark variants (`html.dark.theme-*`) — those are a separate cross-mode
 *     concern (Step 2V), not cross-theme parity
 *   - descendant utility selectors that match the regex but aren't theme blocks
 */
const allSelectors = extractThemeSelectors(indexCss);
const themeNames = new Set<string>();
for (const sel of allSelectors) {
  if (STRUCTURAL_NON_THEME_SELECTORS.has(sel)) continue;
  // Skip dark variants — cross-mode parity is its own canon.
  if (sel.startsWith("html.dark.theme-")) continue;
  const m = sel.match(/^(?:html\.)?\.?theme-([\w-]+)$/) ?? sel.match(/theme-([\w-]+)/);
  if (!m) continue;
  if (m[1] === BASELINE_THEME_NAME) continue;
  // Only include if the merged surface is non-empty (filters descendant utility hits).
  const merged = mergedThemeTokens(m[1]);
  if (merged.size === 0) continue;
  themeNames.add(m[1]);
}

for (const themeName of themeNames) {
  const selectorLabel = `.theme-${themeName} (+ html.theme-${themeName})`;
  describe(`cross-theme parity canon: ${selectorLabel}`, () => {
    const themeTokens = mergedThemeTokens(themeName);
    const allowed = new Set([
      ...(ALLOWLIST_OMISSIONS[`.theme-${themeName}`] ?? []),
      ...(ALLOWLIST_OMISSIONS[`html.theme-${themeName}`] ?? []),
    ]);

    it("defines every color token the baseline theme defines", () => {
      const missing = [...baselineColorTokens]
        .filter((t) => !themeTokens.has(t))
        .filter((t) => !allowed.has(t))
        .sort();
      expect(
        missing,
        `${selectorLabel} missing color tokens defined by baseline (${BASELINE_COLOR_SELECTOR} + ${BASELINE_GRADIENT_SELECTOR}): ${missing.join(", ")}`,
      ).toEqual([]);
    });

    it("introduces no tokens unknown to the baseline theme", () => {
      const extras = [...themeTokens]
        .filter((t) => !baselineTokens.has(t))
        .sort();
      expect(
        extras,
        `${selectorLabel} defines tokens not in baseline: ${extras.join(", ")}`,
      ).toEqual([]);
    });
  });
}
