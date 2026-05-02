// Lint fixture: asserts the Global Overlay Stability doctrine fires when
// a *Fab* / *Popup* / *Overlay* / *Widget* file imports the hero alignment
// signal. Linted by src/test/lint-rule-hero-alignment-signal-overlay.test.ts
// with `ignore: false` to bypass the top-level fixture exclusion.
//
// Pairs with: mem://style/global-overlay-stability
// eslint-disable-next-line no-restricted-imports -- intentional violation; this fixture exists to assert the rule fires
import { subscribeHeroAlignment, readHeroAlignment } from '@/lib/heroAlignmentSignal';

export function BannedFabOverlay() {
  // Reference both imports so the bundler / TS doesn't tree-shake them
  // out before ESLint sees the ImportDeclaration.
  void subscribeHeroAlignment;
  void readHeroAlignment;
  return null;
}
