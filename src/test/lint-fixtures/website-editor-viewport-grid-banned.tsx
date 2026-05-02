/**
 * Banned fixture for the Container-Aware Responsiveness doctrine inside
 * the website-editor tree. The literal `sm:grid-cols-2` className below
 * MUST trip the scoped `no-restricted-syntax` selector — see
 * `src/test/lint-config-resolution.test.ts` for the meta-assertion.
 *
 * Do NOT add this file's path to any `ignores` block — the whole point
 * is to prove the doctrine fires here.
 */
export function BannedViewportGridFixture() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <span>left</span>
      <span>right</span>
    </div>
  );
}
