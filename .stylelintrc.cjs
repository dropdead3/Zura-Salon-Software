/**
 * Stylelint is scoped narrowly: we lint `src/**\/*.css` primarily to enforce
 * the Zura color-token canon (no raw rgba literals outside `:root` / `.dark`).
 *
 * We extend `stylelint-config-standard` but disable the rules that fight
 * Tailwind's authoring model (`@tailwind`, `@apply`, `@layer`, utility class
 * naming, descending specificity from layered resets, etc.).
 */
module.exports = {
  extends: ["stylelint-config-standard"],
  plugins: ["./tools/stylelint-plugins/no-raw-rgba-outside-tokens.cjs"],
  rules: {
    // Tailwind directives
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: ["tailwind", "apply", "layer", "screen", "variants", "responsive"],
      },
    ],
    // Tailwind layered resets legitimately re-declare specificity
    "no-descending-specificity": null,
    // Our utilities use kebab-case + numeric suffixes that don't match the default
    "selector-class-pattern": null,
    // We intentionally use shorthand + longhand together in some places
    "declaration-block-no-redundant-longhand-properties": null,
    // HSL tokens look like `0 0% 100%` — stylelint-config-standard complains
    // about non-numeric values in some contexts; relax.
    "alpha-value-notation": null,
    "color-function-notation": null,
    "hue-degree-notation": null,
    "custom-property-empty-line-before": null,
    "declaration-empty-line-before": null,
    "rule-empty-line-before": null,
    "comment-empty-line-before": null,
    "no-duplicate-selectors": null,
    "font-family-name-quotes": null,
    "value-keyword-case": null,
    "shorthand-property-no-redundant-values": null,
    "property-no-vendor-prefix": null,
    "media-feature-range-notation": null,
    "keyframes-name-pattern": null,
    "selector-pseudo-element-no-unknown": [
      true,
      { ignorePseudoElements: ["webkit-scrollbar", "webkit-scrollbar-thumb", "webkit-scrollbar-track", "webkit-scrollbar-corner"] },
    ],
    "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global"] }],

    // The canon rule
    "zura/no-raw-rgba-outside-tokens": true,
  },
  ignoreFiles: ["dist/**", "node_modules/**", "supabase/**"],
};
