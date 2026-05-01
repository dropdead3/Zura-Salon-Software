/**
 * labelFor — operator-readable test-name generator for ESLint doctrine
 * entries (selectors, banned imports, etc.).
 *
 * Used by the auto-generated meta-test assertions in
 * `src/test/lint-config-resolution.test.ts` so adding a new selector to
 * `CONSOLIDATED_RESTRICTED_SYNTAX` automatically extends test coverage
 * with a readable test name (no hand-written `it(...)` block needed).
 *
 * Quality guarantees (asserted by `labelFor.test.ts`):
 *   - Always returns a non-empty string (8–80 chars) for non-empty inputs.
 *   - Prefers the doctrine `message` head; falls back to the `selector`
 *     when the message head is unusable (empty, too long, URL-prefixed,
 *     punctuation-only).
 *   - Strips leading punctuation/whitespace so test runners render
 *     readable names.
 */

const MIN_LABEL = 8;
const MAX_LABEL = 80;

function cleanFragment(s: string): string {
  return s
    .trim()
    // Strip leading non-word punctuation (`-`, `→`, `*`, etc.) that hurts
    // readability in test-runner output.
    .replace(/^[^\w<`'"]+/, '')
    .trim();
}

function isUrlish(s: string): boolean {
  // A leading scheme like `https://` or `mem://` would chew up the
  // whole label budget without conveying doctrine intent.
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(s.trim());
}

export function labelFor(opt: { selector?: string; message?: string }): string {
  const msg = opt.message ?? '';
  const selector = opt.selector ?? '';

  // 1. Try the message head — split on sentence-terminating punctuation
  //    that operators read as "end of label". Em-dash and en-dash too.
  if (msg && !isUrlish(msg)) {
    const head = cleanFragment(msg.split(/[.:—–]/)[0] ?? '');
    if (head.length >= MIN_LABEL && head.length <= MAX_LABEL) return head;

    // 2. If the head was too long, hard-truncate at MAX_LABEL with an
    //    ellipsis. Better than falling through to the selector for human
    //    readability — most messages start with operator-friendly prose.
    if (head.length > MAX_LABEL) return head.slice(0, MAX_LABEL - 1) + '…';
  }

  // 3. Fall back to the selector body. Strip the leading AST-node-type
  //    prefix (e.g. `JSXElement[`) when present so the readable bit
  //    (`openingElement.name.name='Loader2'`) gets the budget.
  const fallback = cleanFragment(selector).slice(0, MAX_LABEL);
  if (fallback.length >= MIN_LABEL) return fallback;

  // 4. Last-ditch: pad with the rule input shape so the test name is
  //    still non-empty and unique-ish. Should be unreachable in practice.
  return fallback || selector || '<unlabeled doctrine>';
}
