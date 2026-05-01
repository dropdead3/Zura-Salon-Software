// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Authoring-time meta-test: every file-scoped `no-restricted-syntax` and
 * `no-restricted-imports` block in eslint.config.js MUST be built via
 * `defineScopedDoctrine()` or `defineScopedImportDoctrine()`.
 *
 * Why this exists:
 *   The scope helpers concatenate `CONSOLIDATED_RESTRICTED_SYNTAX` /
 *   `PLATFORM_PRIMITIVE_PATHS` with scope-specific entries. If a future
 *   author bypasses the helpers and writes a raw
 *     `{ files: [...], rules: { "no-restricted-syntax": ["error", ...] } }`
 *   block in eslint.config.js, flat-config replacement semantics will
 *   silently drop every entry from the consolidated array on files
 *   matched by both blocks — the same footgun the helpers exist to prevent.
 *
 *   The helpers themselves (eslint.helpers.js) are the ONLY permitted
 *   sites for raw-rule literals, because that's where the helpers BUILD
 *   the consolidated rule arrays.
 *
 * Implementation:
 *   We scan eslint.config.js for `"no-restricted-syntax":` /
 *   `"no-restricted-imports":` literal patterns. A regex scan is
 *   sufficient and has zero parser dependencies — the footgun is
 *   syntactically obvious (you can't write a flat-config rule block
 *   without the literal key string), and false positives would only
 *   happen if someone embeds those strings in a comment or message,
 *   which is detected and ignored via comment stripping.
 *
 * If this test fails:
 *   1. The flagged location is a raw rule definition that bypasses the
 *      helper. Migrate it to `defineScopedDoctrine({ files, extraSelectors })`
 *      or `defineScopedImportDoctrine({ files, extraPaths })`.
 *   2. Do NOT add an exception list — that re-opens the shadowing
 *      footgun the helpers exist to prevent.
 *   3. If you have a TRULY exceptional reason to author a raw block,
 *      add the rule literal to a comment-suppressed region (the test
 *      strips comments before scanning) AND document why in
 *      mem://architecture/preview-live-parity-pattern.md.
 */

// Strip line + block comments so doctrine prose mentioning the rule
// names doesn't trigger false positives. Same approach the SQL doctrine
// scanners use.
function stripComments(src: string): string {
  return src
    // Block comments — non-greedy, multi-line.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Line comments — to end of line.
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

interface Finding {
  rule: string;
  line: number;
  context: string;
}

function findRawRestrictedRuleLiterals(filePath: string): Finding[] {
  const raw = readFileSync(filePath, 'utf-8');
  const stripped = stripComments(raw);
  const lines = stripped.split('\n');
  const findings: Finding[] = [];

  // Match a property-key literal followed by `:`. Both `"foo":` and `'foo':`
  // shapes covered. We deliberately do NOT match the bare identifier form
  // (rule keys are kebab-case, so they MUST be quoted in JS object literals).
  const pattern = /["'](no-restricted-(?:syntax|imports))["']\s*:/g;

  lines.forEach((line, idx) => {
    let m: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(line)) !== null) {
      findings.push({
        rule: m[1],
        line: idx + 1,
        context: line.trim().slice(0, 120),
      });
    }
  });

  return findings;
}

describe('eslint.config.js: helper-usage meta-test', () => {
  it('contains zero raw `no-restricted-syntax` / `no-restricted-imports` literals (every callsite must use the helpers)', () => {
    const configPath = path.resolve(__dirname, '../..', 'eslint.config.js');
    const findings = findRawRestrictedRuleLiterals(configPath);

    if (findings.length > 0) {
      const detail = findings
        .map((f) => `  - eslint.config.js:${f.line}  →  raw "${f.rule}" key  |  ${f.context}`)
        .join('\n');
      throw new Error(
        `Found ${findings.length} raw restricted-rule key(s) in eslint.config.js. ` +
        `These bypass the scope helpers and re-open the flat-config replacement footgun:\n\n${detail}\n\n` +
        `Migrate to defineScopedDoctrine({ files, extraSelectors }) or ` +
        `defineScopedImportDoctrine({ files, extraPaths }) — see eslint.helpers.js for the doctrine.`,
      );
    }
    expect(findings).toHaveLength(0);
  });

  it('helper module retains the raw keys (sanity check that the helpers still build the rule blocks)', () => {
    // If this drops to 0, the helpers were refactored away and the doctrine
    // is unenforced — fail loudly so the maintainer notices. Expect at least
    // 2 (one per helper: defineScopedDoctrine + defineScopedImportDoctrine).
    const helpersPath = path.resolve(__dirname, '../..', 'eslint.helpers.js');
    const findings = findRawRestrictedRuleLiterals(helpersPath);
    expect(
      findings.length,
      `eslint.helpers.js should contain exactly the raw rule keys for the scope helpers (one per helper). Found ${findings.length}.`,
    ).toBeGreaterThanOrEqual(2);
  });
});
