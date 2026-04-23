/**
 * Reads a CSS rule body out of document.styleSheets by selector.
 * jsdom parses CSS rules but does not render them — so we assert on
 * the rule text, not computed styles.
 */
export function findCssRuleText(selector: string): string | null {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText === selector) {
        return rule.cssText;
      }
    }
  }
  return null;
}
