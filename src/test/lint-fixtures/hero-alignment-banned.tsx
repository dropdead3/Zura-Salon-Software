/**
 * Lint fixture — INTENTIONALLY VIOLATES the Hero Alignment Canon.
 *
 * The `cn()` call below mixes a hardcoded `items-center` with NO reference
 * to `alignment.*`, which is the exact pattern the May 2026 hero-notes
 * misalignment regression took. The smoke test asserts the rule fires here.
 *
 * Excluded from `npm run lint` via the top-level `ignores` block in
 * eslint.config.js; lint-rule-hero-alignment.test.ts uses ESLint's
 * `ignore: false` option to bypass that exclusion when asserting.
 */
import { cn } from '@/lib/utils';

export function HeroNotesBanned() {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 text-xs text-muted-foreground font-sans',
        'items-center', // <-- BANNED: hardcoded items-* without alignment.*
      )}
    >
      <p>line one</p>
      <p>line two</p>
    </div>
  );
}
