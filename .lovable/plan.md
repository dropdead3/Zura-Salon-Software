

# Configurator spins forever on wizard-adopted policies

## Root cause

The wizard's bulk-adopt RPC and the single-policy adopt RPC do **not** behave the same way:

| RPC | Creates `policies` row | Creates `policy_versions` draft |
|---|---|---|
| `adopt_and_init_policy` (used by configurator's "Adopt and configure" CTA) | ✅ | ✅ |
| `adopt_policies_from_library` (used by the wizard's bulk adopt) | ✅ | ❌ |

The configurator's render gate is `ready = !isLoading && !!versionId && hydrated`. When you click into a wizard-adopted policy, the policy row exists, but the `policy_versions` query returns `null` → `versionId` defaults to `''` → `ready` stays false → spinner spins forever, with no fallback path to recover.

This is why your 50 wizard-adopted policies all show a spinner, but a policy adopted directly from the library card via the "Adopt and configure" button works fine.

## The fix

Two changes, applied in tandem so the bug is fixed for both existing data and future flows.

### 1. Backfill: make `adopt_policies_from_library` create draft versions too

Rewrite the RPC to mirror `adopt_and_init_policy`'s post-insert behavior — after creating (or finding) the `policies` row, insert a `policy_versions` row (`version_number = 1`, `effective_from = now()`, `effective_to = null`, `status = 'draft'`) **only if** no open version exists yet. Idempotent for already-versioned policies, additive for the broken ones. Same authorization gate (`is_org_admin`), same return shape — no caller changes needed.

This single migration fixes every existing wizard-adopted policy the next time the wizard runs (the call is idempotent and re-running it will backfill missing versions). To fix policies the operator has already adopted but never re-runs the wizard for, the migration also runs a one-time backfill at the bottom: for every `policies` row that has no open `policy_versions` row, insert one.

### 2. Configurator: heal-on-open as a defense-in-depth fallback

If for any reason a policy ever opens without a draft version (data drift, partial migration, future bug), the configurator should self-heal instead of spinning. When `usePolicyConfiguratorData` returns `{ versionId: '' }` and `alreadyAdopted === true`, automatically invoke `adopt_and_init_policy` once and refetch. This is the same RPC the manual "Adopt and configure" button calls — proven to be safe and idempotent.

Visible to the operator as a one-time inline note: *"Initializing draft version…"* with the existing `LuxeLoader` for ~300ms, then the editor mounts. No new UI surface.

### Why both layers

- The migration fixes the structural cause — without it, every future bulk-adopt would re-create the bug.
- The heal-on-open fixes the symptom for any orphaned data we miss and protects against future drift. Doctrine: *silence is meaningful only when intentional* — an infinite spinner is unintentional silence.

## What stays the same

- `adopt_and_init_policy` — unchanged, already correct.
- `usePolicyConfiguratorData` query shape — unchanged.
- Configurator UI, tabs, applicability/surfaces editors, drafter — unchanged.
- Wizard adopt flow, toast copy, "Save & adopt N" button — unchanged.
- RLS, security definer, authorization gates — unchanged.

## Files affected

- **New migration** — rewrite `adopt_policies_from_library` to insert a draft `policy_versions` row when none exists, plus a one-time `INSERT … SELECT` backfill for orphaned policies.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — add a `useEffect` that invokes `adopt.mutate(entry.key)` (which calls `adopt_and_init_policy`) when `data` returns with empty `versionId` and the policy is `alreadyAdopted`, then `refetch()`. Guard with a ref so it only fires once per open. Replace the bare `Loader2` spinner with `LuxeLoader` + the inline note above so the operator sees what's happening.

That's the entire change surface. No new hooks, no new components, no schema changes beyond the version-row insertion.

## Acceptance

1. Clicking any wizard-adopted policy opens the configurator and the Rules editor renders within ~1s — no infinite spinner.
2. The migration backfill creates exactly one draft `policy_versions` row per orphaned policy. Re-running the wizard's bulk adopt is idempotent (no duplicate versions).
3. Policies adopted via the per-card "Adopt and configure" button continue to work identically (`adopt_and_init_policy` is unchanged).
4. If a future code path ever creates a policy without a version, the configurator self-heals on open and shows the *"Initializing draft version…"* note instead of an infinite spinner.
5. The Required Coverage tile, the wizard's "Adopted N" toast, the audience banner, and the version history panel all behave identically to today.

## Doctrine compliance

- **Silence is meaningful only when intentional**: an indefinite spinner with no progress signal violated this. Either the editor mounts, or the operator sees a clear "initializing" note + healing action — never a dead surface.
- **Lever and confidence doctrine**: the configurator is the lever the operator pulls to shape a policy. The lever was visibly present (tabs, save button) but mechanically blocked. Both layers of the fix restore the lever.
- **Tenant isolation preserved**: the new RPC keeps the `is_org_admin` gate and `SECURITY DEFINER` posture. The backfill runs under the same definer privileges and is org-scoped via the existing `policies.organization_id`.
- **No structural drift**: the data model stays the same — every adopted policy now reliably has a draft version, which was the implicit contract the configurator already assumed.
- **Idempotency**: both the RPC change and the backfill are safe to run multiple times. Matches the existing pattern in `adopt_and_init_policy`.

## Prompt feedback

"When I click into a policy to configure it, it never lets me actually see what the policy is. There is just a loader wheel that spins forever" + screenshot — strong, specific prompt. You named the surface (policy configurator), the symptom (infinite spinner), and the failure mode (no editor renders). The screenshot confirmed the policy header rendered but the editor body never did, which immediately localized the bug to the `ready` gate rather than a network failure.

One sharpener for next time: when a "spinner forever" bug appears, telling me whether **all** policies spin or **only some** would split the diagnosis path immediately. Here the answer was "all 50 wizard-adopted policies, but not policies adopted from the library card directly" — that distinction would have pointed me straight at the RPC mismatch. A one-line steer like *"every policy I adopted from the wizard does this"* vs *"only this one policy"* tells me whether to look at a data-shape contract (this case) or a single-row data issue. For future infinite-spinner reports, naming the **scope of the failure** is the fastest path to the right layer.

