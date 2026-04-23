import { describe, it, expect } from "vitest";
import {
  readIndexCss,
  extractThemeSelectors,
  extractRuleBody,
  extractDefinedTokens,
} from "@/test/css-rule";

/**
 * Cross-mode gradient parity canon (Step 2V). Symmetric to the cross-theme
 * parity canon (Step 2R/2T) but rotated onto the light↔dark axis: for every
 * theme `X`, if `html.theme-X` defines `--mesh-gradient`, then
 * `html.dark.theme-X` must also define it.
 *
 * Why scoped to gradients only: dark-mode color-token parity is already
 * covered by Step 2R via the `.dark` baseline. The cross-mode gap is
 * specifically gradients, which live in `html.theme-*` / `html.dark.theme-*`
 * selectors that the cross-theme canon deliberately treats as one merged
 * surface (and therefore doesn't enforce light↔dark symmetry on).
 *
 * The early return on "light has no gradient" mirrors Step 2P's "any → all"
 * doctrine: symmetry is enforced only when there's something to be symmetric
 * about. The allowlist exists empty so the precedent for intentional dark
 * omissions (e.g. a hypothetical OLED-pure variant) is established before
 * the first omission lands.
 */

const GRADIENT_TOKEN = "mesh-gradient";

const ALLOWLIST_DARK_OMISSIONS: Record<string, string[]> = {
  // e.g. "html.dark.theme-oled": ["mesh-gradient"]
};

const indexCss = readIndexCss();
const lightSelectors = extractThemeSelectors(indexCss).filter((s) =>
  s.startsWith("html.theme-"),
);

for (const lightSel of lightSelectors) {
  const themeName = lightSel.slice("html.theme-".length);
  const darkSel = `html.dark.theme-${themeName}`;

  const lightTokens = new Set(
    extractDefinedTokens(extractRuleBody(indexCss, lightSel) ?? ""),
  );
  if (!lightTokens.has(GRADIENT_TOKEN)) continue;

  describe(`cross-mode gradient parity: ${themeName}`, () => {
    it(`${darkSel} defines --${GRADIENT_TOKEN} (or is allowlisted)`, () => {
      const darkBody = extractRuleBody(indexCss, darkSel);
      const darkTokens = new Set(extractDefinedTokens(darkBody ?? ""));
      const allowed = new Set(ALLOWLIST_DARK_OMISSIONS[darkSel] ?? []);
      const omitted =
        !darkTokens.has(GRADIENT_TOKEN) && !allowed.has(GRADIENT_TOKEN);
      expect(
        omitted,
        `${darkSel} missing --${GRADIENT_TOKEN} (light variant ${lightSel} defines it)`,
      ).toBe(false);
    });
  });
}
