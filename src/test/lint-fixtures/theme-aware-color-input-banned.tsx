/**
 * Lint fixture for the ThemeAwareColorInput single-ownership doctrine.
 * This file MUST stay outside the real component tree (top-level `ignores`
 * keeps `npm run lint` from picking it up) but is included explicitly in
 * the doctrine block so the meta-test sees the rule applied.
 *
 * The line below should always trigger
 * `no-restricted-syntax / theme-aware-color-input` when the rule is wired.
 * If your edit accidentally drops the rule, the resolution meta-test
 * (`src/test/lint-config-resolution.test.ts`) will fail.
 */
// @ts-nocheck
export function Banned() {
  return <input type="color" value="#000000" onChange={() => {}} />;
}
