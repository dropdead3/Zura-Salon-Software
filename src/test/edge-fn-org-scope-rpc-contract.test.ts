/**
 * Edge Function org-scope RPC arg-shape contract.
 *
 * Two Postgres helpers gate authorization across the edge layer:
 *   - is_org_admin(_user_id uuid, _org_id uuid)
 *   - is_org_member(_user_id uuid, _org_id uuid)
 *
 * Same silent-NULL footgun for both: passing `_organization_id` (or any other
 * key) makes the RPC silently return NULL and authorization checks fall
 * through. We've already hit this once in production (OAuth audit telemetry,
 * `policy-draft-variants`).
 *
 * This test scans every `supabase/functions/**\/*.ts` file, finds each
 * `.rpc("is_org_admin"|"is_org_member", { ... })` call, and asserts the
 * object literal uses EXACTLY `_user_id` and `_org_id` keys.
 *
 * Add a new edge function that mistypes the arg → this test fails at
 * authoring time instead of in production logs.
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
 * Find every `.rpc("<rpcName>", { ... })` invocation and extract the keys
 * from its argument object literal. Tolerates multi-line object literals and
 * trailing commas.
 */
function findRpcCalls(source: string, file: string, rpcName: string): Call[] {
  const calls: Call[] = [];
  const re = new RegExp(
    String.raw`\.rpc\(\s*["']${rpcName}["']\s*,\s*\{([\s\S]*?)\}\s*\)`,
    'g',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const argsBlock = m[1];
    const lineNumber = source.slice(0, m.index).split('\n').length;
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
const RPCS = ['is_org_admin', 'is_org_member'] as const;
const ALL_FILES = walk(FUNCTIONS_DIR);

describe.each(RPCS)('%s RPC arg-shape contract', (rpcName) => {
  const calls: Call[] = [];
  for (const f of ALL_FILES) {
    const src = readFileSync(f, 'utf8');
    calls.push(...findRpcCalls(src, f, rpcName));
  }

  it(`finds at least one ${rpcName} call (sanity)`, () => {
    expect(calls.length).toBeGreaterThan(0);
  });

  it.each(
    calls.map((c) => [
      `${c.file.replace(process.cwd() + '/', '')}:${c.line}`,
      c,
    ] as const),
  )('%s — uses exactly { _user_id, _org_id }', (_label, call) => {
    const keys = new Set(call.keys);
    for (const expected of EXPECTED_KEYS) {
      expect(
        keys.has(expected),
        `Missing key "${expected}". Found: [${[...keys].join(', ')}]\nArgs block: ${call.argsBlock}`,
      ).toBe(true);
    }
    for (const k of keys) {
      expect(
        EXPECTED_KEYS.has(k),
        `Unexpected key "${k}". The RPC signature is ${rpcName}(_user_id uuid, _org_id uuid). Found: [${[...keys].join(', ')}]\nArgs block: ${call.argsBlock}`,
      ).toBe(true);
    }
  });
});
