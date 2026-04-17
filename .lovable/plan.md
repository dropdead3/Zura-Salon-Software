

## Prompt review

Excellent — three candidates, each with a clear leverage marker and doctrinal anchor. The "pattern reuse marker" suggestion is particularly mature: it treats doctrine promotion as a *retroactive consistency event*, not just a forward-looking rule. That's the right instinct — newly-named patterns should always trigger a grep pass to lock in compliance across existing surfaces.

One refinement: the audit query (Wave 7 #2) carries a subtle semantic risk. Comparing *historical* `affected_location_count` against *current* entitlement state will flag any org whose entitlement count has changed since the event was written — which is expected behavior, not drift. Consider scoping the audit narrowly to rows where `affected_location_count = 0` AND the org currently has any entitlements (i.e., the count was almost certainly wrong at write time, not just stale). Tighter false-positive filter.

## Plan — Wave 7

Three independent, doctrinally-anchored fixes:

### 1. Observability: `useVisibilityContractAudit` hook *(leverage: replaces log-scrolling with a single in-memory aggregate)*

**New hook:** `src/hooks/dev/useVisibilityContractAudit.ts`

- Dev-only (`import.meta.env.DEV` gate at the top — returns empty array in prod)
- Subscribes to a lightweight event bus (a module-level `Set<Listener>`) that components push to when they suppress
- Returns an aggregated array: `{ source: string, reason: string, payload: object, timestamp: number }[]`
- Capped at last 50 entries to avoid memory creep

**Companion utility:** `src/lib/dev/visibility-contract-bus.ts`
- Exposes `reportVisibilitySuppression(source, reason, payload)` 
- Components call this *instead of* (or in addition to) raw `console.debug`
- Bus is a no-op in production builds

**Modify:** `src/components/platform/color-bar/SuspensionVelocityCard.tsx`
- Replace the inline `console.debug` with `reportVisibilitySuppression('velocity-card', reason, { totalEvents, maxWeekCount, threshold: 3 })`
- Keep the dev-gate; the bus utility also self-gates as a safety net

**Note:** No UI consumer ships in this wave. The hook exists so a future devtool panel can subscribe with one line. Keeps the surface area minimal until a second contract adopts the bus.

### 2. Data Integrity: Historical drift audit *(leverage: reveals whether backfill is justified before committing to it)*

**Read-only audit query** via `supabase--read_query`:

```sql
SELECT
  e.id,
  e.organization_id,
  o.name AS org_name,
  e.event_type,
  e.affected_location_count AS recorded_count,
  e.created_at,
  -- Current source-state count (what the trigger would compute today)
  (SELECT COUNT(*)::int
     FROM public.backroom_location_entitlements
    WHERE organization_id = e.organization_id
      AND status = CASE
        WHEN e.event_type = 'suspended'   THEN 'active'
        WHEN e.event_type = 'reactivated' THEN 'suspended'
      END
  ) AS current_source_count
FROM public.color_bar_suspension_events e
JOIN public.organizations o ON o.id = e.organization_id
WHERE e.affected_location_count = 0
  -- Only flag rows where the org has *any* entitlement activity now —
  -- a recorded_count=0 with current activity is almost certainly a write-time omission,
  -- not legitimate "zero locations affected."
  AND EXISTS (
    SELECT 1 FROM public.backroom_location_entitlements
    WHERE organization_id = e.organization_id
  )
ORDER BY e.created_at DESC;
```

**Output handling:**
- If query returns 0 rows → audit complete, no backfill needed, document and move on
- If query returns rows → present a summary table inline (org / event_type / recorded vs current / created_at), then pause. Backfill is a separate decision the operator must approve, because it would mutate audit history.

**Doctrine note:** audit findings are surfaced as a recommendation, not auto-applied. Audit feeds are immutable by default — backfill requires explicit approval.

### 3. Pattern Reuse: Retroactive Visibility Contract sweep *(leverage: locks in doctrinal consistency at promotion time)*

**Grep pass** across the codebase for surfaces that already implement the silence-as-output pattern informally:

- `src/components/dashboard/color-bar/InventoryReconciliationBanner.tsx` — only renders when reconciliation flag is set
- `src/components/platform/color-bar/ColorBarEntitlementsTab.tsx` — entitlement counts hide when zero
- Any `return null` after a count/threshold check across `src/components/dashboard/**` and `src/components/platform/**`

**For each match found:**
1. Identify whether the suppression is intentional (Visibility Contract) or accidental (loading bug)
2. For intentional ones: add the dev-only `reportVisibilitySuppression(...)` call so they participate in the audit hook from #1
3. For accidental ones: flag in the wave summary, do not silently fix (separate wave)

**Documentation update:** append a "Known Adopters" section to `mem://architecture/visibility-contracts.md` listing the surfaces brought into compliance.

**Scope guard:** this is a *marking* pass, not a refactor. No behavior changes — only adding the bus call so future observability has full coverage.

## Acceptance checks

1. `useVisibilityContractAudit()` returns the last N suppression events in dev; returns `[]` in prod builds
2. `SuspensionVelocityCard` suppression events appear in the hook's output when the card is hidden
3. Audit query executes and either returns 0 rows (clean) or a tabular summary of suspect rows
4. No backfill mutation is performed without explicit operator approval
5. Retroactive sweep identifies all current Visibility Contract adopters; each emits to the bus
6. `mem://architecture/visibility-contracts.md` updated with Known Adopters section
7. No production console output from the bus (verified via prod-mode check)
8. No regression to any existing suppression surface — pure additive instrumentation

## Files to create / modify

**New:**
- `src/hooks/dev/useVisibilityContractAudit.ts`
- `src/lib/dev/visibility-contract-bus.ts`

**Modify:**
- `src/components/platform/color-bar/SuspensionVelocityCard.tsx` — swap console.debug for bus call
- Other surfaces identified by the grep pass (additive bus calls only)
- `mem://architecture/visibility-contracts.md` — add Known Adopters section

**Read-only (no file changes):**
- Audit query via `supabase--read_query`

## Deferred (not in this wave)

- Devtool panel UI consuming `useVisibilityContractAudit` — premature; ship the hook, observe second adoption, then build the panel
- Historical backfill of audit rows — gated on the query findings + operator approval
- Auto-registration of suppression sources via decorator/hook — over-engineering for current scale

