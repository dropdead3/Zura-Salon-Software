/**
 * Edge Function `is_org_admin` arg-shape contract.
 *
 * The Postgres function is defined as `is_org_admin(_user_id uuid, _org_id uuid)`.
 * If an edge function calls it with `_organization_id` (or any other key), the
 * RPC silently returns NULL and authorization checks fall through — that's
 * exactly the bug the OAuth audit telemetry hit (silent 403s).
 *
 * This test scans every `supabase/functions/**\/*.ts` file, finds each
 * `.rpc("is_org_admin", { ... })` call, and asserts the object literal uses
 * EXACTLY `_user_id` and `_org_id` keys — no aliases, no typos.
 *
 * Add a new edge function that mistypes the arg → this test fails at authoring
 * time instead of in production logs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FUNCTIONS_DIR = join(process.cwd(), 'supabase/functions');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (entry.endsWith('.ts')) out.push(p);
  }
  return out;
}

interface Call {
  file: string;
  line: number;
  argsBlock: string;
  keys: string[];
}

/**
 * Find every `.rpc("is_org_admin", { ... })` invocation and extract the keys
 * from its argument object literal. Tolerates multi-line object literals and
 * trailing commas.
 */
function findIsOrgAdminCalls(source: string, file: string): Call[] {
  const calls: Call[] = [];
  // Match `.rpc("is_org_admin"` or `.rpc('is_org_admin'` then capture up to the
  // matching closing brace of the args object. Greedy across newlines.
  const re = /\.rpc\(\s*["']is_org_admin["']\s*,\s*\{([\s\S]*?)\}\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const argsBlock = m[1];
    const lineNumber = source.slice(0, m.index).split('\n').length;
    // Extract object-literal keys: `_foo:` or `_foo :` at start of token.
    const keyRe = /(?:^|[\s,{])(_[a-zA-Z_]+)\s*:/g;
    const keys: string[] = [];
    let km: RegExpExecArray | null;
    while ((km = keyRe.exec(argsBlock)) !== null) {
      keys.push(km[1]);
    }
    calls.push({ file, line: lineNumber, argsBlock: argsBlock.trim(), keys });
  }
  return calls;
}

const EXPECTED_KEYS = new Set(['_user_id', '_org_id']);

describe('is_org_admin RPC arg-shape contract', () => {
  const allFiles = walk(FUNCTIONS_DIR);
  const allCalls: Call[] = [];
  for (const f of allFiles) {
    const src = readFileSync(f, 'utf8');
    allCalls.push(...findIsOrgAdminCalls(src, f));
  }

  it('finds at least one is_org_admin call (sanity)', () => {
    expect(allCalls.length).toBeGreaterThan(5);
  });

  it.each(
    allCalls.map((c) => [
      `${c.file.replace(process.cwd() + '/', '')}:${c.line}`,
      c,
    ] as const),
  )('%s — uses exactly { _user_id, _org_id }', (_label, call) => {
    const keys = new Set(call.keys);
    // Must contain both expected keys.
    for (const expected of EXPECTED_KEYS) {
      expect(
        keys.has(expected),
        `Missing key "${expected}". Found: [${[...keys].join(', ')}]\nArgs block: ${call.argsBlock}`,
      ).toBe(true);
    }
    // Must NOT contain any extra keys (catches `_organization_id`, `_uid`, etc).
    for (const k of keys) {
      expect(
        EXPECTED_KEYS.has(k),
        `Unexpected key "${k}". The RPC signature is is_org_admin(_user_id uuid, _org_id uuid). Found: [${[...keys].join(', ')}]\nArgs block: ${call.argsBlock}`,
      ).toBe(true);
    }
  });
});
