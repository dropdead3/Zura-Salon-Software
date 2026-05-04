/**
 * Connect-Google backfill RLS contract.
 *
 * `ConnectGooglePage.handleBackfill` writes directly to
 * `review_platform_connections` from the client (no edge fn), updating
 * `location_id` on rows where it was previously NULL. That client write
 * relies entirely on Row Level Security to keep one org out of another's
 * Google connections.
 *
 * This test scans `supabase/migrations/**` for the most-recently-defined
 * UPDATE policy on `review_platform_connections` and asserts:
 *
 *   1. RLS is enabled on the table.
 *   2. There is exactly one canonical UPDATE policy.
 *   3. Its USING clause routes through `is_org_admin(auth.uid(), organization_id)`
 *      — never `USING (true)` and never a non-admin gate.
 *   4. The migration uses the `is_org_admin` arg-shape canon (matching
 *      `mem://architecture/org-scope-rpc-arg-shape-canon`).
 *
 * Failure here means a future migration weakened the gate that protects the
 * client-side backfill. Catch at authoring time, not in a tenant-leak postmortem.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations');
const TABLE = 'review_platform_connections';

function loadMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort() // chronological — last entry wins for redefinitions.
    .map((f) => ({ file: f, sql: readFileSync(join(MIGRATIONS_DIR, f), 'utf-8') }));
}

describe('review_platform_connections backfill RLS contract', () => {
  const migrations = loadMigrations();

  it('enables RLS on the table', () => {
    const enabled = migrations.some((m) =>
      new RegExp(
        String.raw`ALTER\s+TABLE\s+(?:public\.)?${TABLE}\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY`,
        'i',
      ).test(m.sql),
    );
    expect(enabled, `expected ENABLE ROW LEVEL SECURITY on ${TABLE}`).toBe(true);
  });

  it('defines an org-admin-gated UPDATE policy and never `USING (true)`', () => {
    // Capture every CREATE POLICY ... ON review_platform_connections ... FOR UPDATE block.
    const policyRe = new RegExp(
      String.raw`CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?${TABLE}\s+FOR\s+UPDATE\s+([\s\S]*?);`,
      'gi',
    );

    const updatePolicies: Array<{ file: string; name: string; body: string }> = [];
    for (const m of migrations) {
      let match: RegExpExecArray | null;
      while ((match = policyRe.exec(m.sql)) !== null) {
        updatePolicies.push({ file: m.file, name: match[1], body: match[2] });
      }
    }

    expect(
      updatePolicies.length,
      `expected at least one UPDATE policy on ${TABLE}`,
    ).toBeGreaterThan(0);

    // No policy may use the public escape hatch.
    for (const p of updatePolicies) {
      expect(
        /USING\s*\(\s*true\s*\)/i.test(p.body),
        `policy "${p.name}" in ${p.file} uses USING (true) — strictly prohibited`,
      ).toBe(false);
    }

    // The most recent definition (last in chronological order) is the
    // effective policy. It must route through is_org_admin(...) against
    // organization_id.
    const effective = updatePolicies[updatePolicies.length - 1];
    expect(
      /is_org_admin\s*\(\s*auth\.uid\(\)\s*,\s*organization_id\s*\)/i.test(effective.body),
      `effective UPDATE policy "${effective.name}" (${effective.file}) must gate on is_org_admin(auth.uid(), organization_id) — current body:\n${effective.body}`,
    ).toBe(true);
  });

  it('never re-introduces a non-admin (member-only) UPDATE gate', () => {
    const memberOnlyRe = new RegExp(
      String.raw`CREATE\s+POLICY\s+"[^"]+"\s+ON\s+(?:public\.)?${TABLE}\s+FOR\s+UPDATE[\s\S]*?is_org_member\s*\(`,
      'gi',
    );
    for (const m of migrations) {
      expect(
        memberOnlyRe.test(m.sql),
        `${m.file} grants UPDATE on ${TABLE} via is_org_member — must be is_org_admin`,
      ).toBe(false);
    }
  });
});
