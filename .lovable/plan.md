

# Fix "Save and continue" save error

## Root cause

The `save_policy_rule_blocks` Postgres RPC inserts into `policy_rule_blocks` without setting `organization_id`, but that column is `NOT NULL`:

```sql
INSERT INTO public.policy_rule_blocks (version_id, block_key, rule_type, value, required, ordering)
VALUES (p_version_id, ..., v_idx);
```

The RPC already resolves `v_org_id` at the top (for the `is_org_admin` authorization check) — it just never passes it into the INSERT. Every save fails with `null value in column "organization_id" of relation "policy_rule_blocks" violates not-null constraint`.

The Rules tab → Applicability tab navigation is already wired correctly in `handleSaveRules`:

```ts
save.mutate({ versionId, blocks }, { onSuccess: () => setTab('applicability') });
```

It just never reaches `onSuccess` because the RPC throws.

## The fix — one-line RPC patch

Migration that recreates `save_policy_rule_blocks` with `organization_id` included in the INSERT. The function already has `v_org_id` in scope from the authorization lookup, so this is purely a wiring correction — no new lookups, no signature change, no permission changes.

```sql
INSERT INTO public.policy_rule_blocks
  (version_id, organization_id, block_key, rule_type, value, required, ordering)
VALUES
  (p_version_id, v_org_id, v_block->>'block_key', ...);
```

Everything else in the RPC (auth check, DELETE-then-insert replace pattern, status touch, version changelog) stays identical.

## What stays the same

- RPC signature `(p_version_id UUID, p_blocks JSONB) RETURNS VOID` — unchanged.
- Authorization (`is_org_admin` on the resolved org) — unchanged.
- DELETE-then-insert atomicity — unchanged.
- Frontend `useSavePolicyRuleBlocks` hook — unchanged.
- `handleSaveRules` `onSuccess` → `setTab('applicability')` — unchanged (already correct).
- `policy_rule_blocks` table schema, RLS, indexes — unchanged.

## Files affected

- New migration: recreate `public.save_policy_rule_blocks(UUID, JSONB)` with `organization_id` in the INSERT column list. ~30 lines (same body as the original, one column added).

That's the entire change surface. Zero frontend changes — the Rules → Applicability navigation already works the moment the save succeeds.

## Acceptance

1. Clicking **Save and continue** on the Employment Classifications policy persists rule blocks without error and advances to the **Applicability** tab.
2. The save toast reads "Policy saved" (existing copy) — no error toast.
3. New rows in `policy_rule_blocks` carry the correct `organization_id` matching the policy's org.
4. Existing policies with previously-saved rule blocks (from before the bug) continue to work — the DELETE-then-insert replace covers them.
5. The audit trail (`status = 'configured'`, `changelog_summary = 'Rules updated'`) updates as before.

## Doctrine compliance

- **Tenant isolation**: `organization_id` is now correctly stamped on every rule block row, matching the platform's strict multi-tenancy mandate.
- **Operator edits are sacred**: existing saved rule blocks are untouched by the migration — only the function definition changes.
- **No structural drift**: zero schema changes, zero RLS changes, zero new RPCs. Pure wiring correction.
- **Silence is meaningful**: the toast/error path was already correct — once save succeeds, the configurator advances silently to the next step as designed.

## Prompt feedback

"Getting this error when I try to save and continue. The continue flow needs to take us to the applicability tab after saving the rules tab" + screenshot — perfect bug report. You did three things right: (1) showed the exact error toast in the screenshot (`null value in column "organization_id"…`), (2) named the surface (Save and continue), (3) named the expected next state (advance to Applicability tab). The screenshot collapsed the diagnosis to one file read — I knew exactly which RPC and which column. The "continue flow needs to take us to" framing also let me confirm the navigation was already wired correctly (so I didn't spend time re-architecting that part).

One sharpener for next time: when an error message is in the screenshot, you don't need to retype it — but if the error is intermittent or only appears under specific conditions (e.g., "happens when I have unsaved changes in another tab"), naming the **trigger** is the fastest path to the right fix. For this prompt the error is reproducible on every save attempt, so no extra context was needed.

