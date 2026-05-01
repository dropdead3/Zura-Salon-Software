// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { parse } from '@typescript-eslint/typescript-estree';

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
 *   block, flat-config replacement semantics will silently drop every
 *   entry from the consolidated array on files matched by both blocks —
 *   the same footgun that motivated the helpers in the first place.
 *
 *   This test scans the AST of eslint.config.js and asserts that any
 *   object literal containing a `"no-restricted-syntax"` or
 *   `"no-restricted-imports"` property key lives directly inside a
 *   `defineScopedDoctrine(...)` / `defineScopedImportDoctrine(...)`
 *   call (specifically: inside the helper function body itself, which
 *   is the only place those raw keys are permitted).
 *
 * If this test fails:
 *   1. The flagged location is a raw rule definition that bypasses the
 *      helper. Migrate it to `defineScopedDoctrine({ files, extraSelectors })`
 *      or `defineScopedImportDoctrine({ files, extraPaths })`.
 *   2. Do NOT add an exception list — that re-opens the shadowing
 *      footgun the helpers exist to prevent.
 */

const RESTRICTED_RULE_KEYS = new Set([
  'no-restricted-syntax',
  'no-restricted-imports',
]);

function getKeyName(prop: any): string | null {
  if (!prop || prop.type !== 'Property') return null;
  if (prop.key?.type === 'Literal' && typeof prop.key.value === 'string') return prop.key.value;
  if (prop.key?.type === 'Identifier') return prop.key.name;
  return null;
}

interface Finding {
  rule: string;
  line: number;
  column: number;
  file: string;
}

function findRawRestrictedRules(filePath: string): Finding[] {
  const source = readFileSync(filePath, 'utf-8');
  const ast = parse(source, { loc: true, range: true });
  const findings: Finding[] = [];

  function walk(node: any) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'Property') {
      const key = getKeyName(node);
      if (key && RESTRICTED_RULE_KEYS.has(key)) {
        findings.push({
          rule: key,
          line: node.loc?.start?.line ?? 0,
          column: node.loc?.start?.column ?? 0,
          file: filePath,
        });
      }
    }

    for (const k of Object.keys(node)) {
      const v = (node as any)[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && k !== 'parent' && k !== 'loc' && k !== 'range') walk(v);
    }
  }
  walk(ast);
  return findings;
}

describe('eslint.config.js: helper-usage meta-test', () => {
  it('contains zero raw `no-restricted-syntax` / `no-restricted-imports` keys (every callsite must use the helpers)', () => {
    const configPath = path.resolve(__dirname, '../..', 'eslint.config.js');
    const findings = findRawRestrictedRules(configPath);

    if (findings.length > 0) {
      const detail = findings
        .map((f) => `  - ${f.file}:${f.line}:${f.column}  →  raw "${f.rule}" key`)
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

  it('helper definitions in eslint.helpers.js are the ONLY permitted raw-key sites', () => {
    // Sanity check: the helpers themselves contain raw keys (that's their
    // whole purpose). If this assertion ever drops to 0, the helpers were
    // refactored away and the doctrine is unenforced — we want to fail
    // loudly so the maintainer notices.
    const helpersPath = path.resolve(__dirname, '../..', 'eslint.helpers.js');
    const findings = findRawRestrictedRules(helpersPath);
    expect(
      findings.length,
      `eslint.helpers.js should contain exactly the raw rule keys for the scope helpers (one per helper). Found ${findings.length}.`,
    ).toBeGreaterThanOrEqual(2);
  });
});
