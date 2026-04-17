

## Prompt review

Strong — three clean, doctrinally-anchored candidates with leverage markers. The "quantify the silence" suggestion is particularly sharp: it addresses a real blind spot in the alert-fatigue doctrine (you can't distinguish "working correctly + silent" from "broken + silent"). The Visibility Contracts naming proposal is also overdue — Waves 4 and 5 both shipped the same pattern, and naming it now prevents drift in Wave 6+.

One refinement: for the trigger guard (Wave 6 #3), consider whether the trigger should **auto-populate** the count rather than just **validate** it. Validation rejects bad writes (good — fails loudly), but auto-population means writers can omit the field entirely and the trigger fills it from a single source of truth. Auto-populate is more durable; validate is more explicit. I'd lean auto-populate with a `COALESCE` so explicit values still win when callers know better (e.g., snapshot-at-time-of-event semantics).

## Plan — Wave 6

Three independent fixes, each anchored + leverage-marked:

### 1. Observability: Quantify the silence *(leverage: turns silent failures into debuggable signals)*

**Modify:** `src/components/platform/color-bar/SuspensionVelocityCard.tsx`

Add a single dev-only `console.debug` line emitted from the suppression branch, structured as:
```
[velocity-card] suppressed: { reason: 'no-trigger-week' | 'no-events' | 'loading', totalEvents, maxWeekCount, threshold: 3 }
```

Gated on `import.meta.env.DEV` so it never reaches production logs. No UI change, no new dependency, no behavior change — purely diagnostic.

Acceptance: in dev, opening `ColorBarAnalyticsTab` with zero events logs once with `reason: 'no-events'`; with sub-threshold events logs `reason: 'no-trigger-week'` plus the actual `maxWeekCount`.

### 2. Doctrine: Promote "Visibility Contracts" to memory *(leverage: prevents re-derivation in future waves)*

**New memory file:** `mem://architecture/visibility-contracts`

Capture the pattern formalized across Waves 4-5:
- **What:** A feature surface that returns `null` when its data does not meet a defined materiality threshold
- **Why:** Honors alert-fatigue doctrine ("silence is valid output"); prevents low-confidence surfaces from competing for attention
- **How:** Component computes a display gate (e.g., `≥3 events in any week`, `≥10 underwriting signals`); returns `null` when gate is unmet; logs suppression reason in dev mode (per Wave 6 #1)
- **Examples:** `SuspensionVelocityCard` (12-week ≥3 threshold), future churn/retention/utilization sparklines

**Update:** `mem://index.md` — add reference under Memories, and add a Core one-liner: "Visibility Contracts: silence is valid output. Surfaces with materiality thresholds must return null when unmet."

### 3. Data Integrity: Audit count guard *(leverage: prevents stale/lying audit feed)*

**New migration:** Trigger on `color_bar_suspension_events`

```sql
CREATE OR REPLACE FUNCTION public.populate_suspension_event_location_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate from current entitlement state if caller didn't specify
  -- COALESCE preserves explicit snapshot values (e.g., backfills)
  NEW.affected_location_count := COALESCE(
    NEW.affected_location_count,
    (
      SELECT COUNT(*)::int
      FROM public.backroom_location_entitlements
      WHERE organization_id = NEW.organization_id
        AND status = CASE
          WHEN NEW.event_type = 'suspended' THEN 'active'      -- locations *about to be* suspended
          WHEN NEW.event_type = 'reactivated' THEN 'suspended' -- locations *about to be* reactivated
        END
    ),
    0
  );

  -- Hard guard: never allow NULL into the audit feed
  IF NEW.affected_location_count IS NULL THEN
    RAISE EXCEPTION 'affected_location_count cannot be NULL';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_populate_suspension_event_count
  BEFORE INSERT ON public.color_bar_suspension_events
  FOR EACH ROW EXECUTE FUNCTION public.populate_suspension_event_location_count();
```

**Pre-check via `supabase--read_query`** before migration:
- Confirm current column nullability of `affected_location_count`
- Confirm no existing trigger with the same name
- Spot-check a few existing rows to ensure the count semantics (active→suspended counts active rows) match historical writes

**Note on semantics:** the trigger counts the *source* state of the transition (active rows for a suspension event, suspended rows for a reactivation), matching how the application code already populates this field in `useColorBarToggle.ts`. If pre-check reveals historical drift, surface it before applying.

## Acceptance checks

1. Dev console emits exactly one `[velocity-card] suppressed: …` line per render when card is hidden; zero lines when card renders
2. Production builds emit no debug logs (gated on `import.meta.env.DEV`)
3. `mem://architecture/visibility-contracts` exists and is referenced from `mem://index.md`
4. New core rule appears in index Core section
5. Inserting into `color_bar_suspension_events` without `affected_location_count` succeeds and the field is auto-populated
6. Inserting with an explicit `affected_location_count` preserves the explicit value (snapshot semantics)
7. Inserting with `NULL` after the COALESCE chain (i.e., zero matching entitlements) yields `0`, never NULL
8. No regression to `useColorBarToggle.ts` write path — existing explicit counts still pass through

## Files to create / modify

**New:**
- Migration: trigger + function for `color_bar_suspension_events`
- `mem://architecture/visibility-contracts`

**Modify:**
- `src/components/platform/color-bar/SuspensionVelocityCard.tsx` — dev-only suppression log
- `mem://index.md` — add Core rule + Memories reference

## Deferred (not in this wave)

- Backfill audit for historical rows with `affected_location_count = 0` where the actual count differs — needs a separate read-only audit pass first
- Surfacing the suppression log in a platform devtool panel — premature; console is enough until a second contract ships
- Constraint enforcement on `affected_location_count >= 0` — minor; trigger already guarantees non-null integer

