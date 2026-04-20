

## Goal
Two parallel improvements:

1. **Parse states from existing location data** — `state_province` column is empty for many orgs, but state lives inside the `city` field as `"Mesa, AZ 85203"`. Stop showing "—" when we can clearly extract it.
2. **Embrace multi-state reality** — model `primary_state` as **operating states** (multi). A multi-loc org in AZ + CA must drive policy applicability for both, not one.

Plus targeted UI/utility upgrades the screenshot exposes.

## What's wrong (from screenshot)

| Issue | Cause | Fix |
|---|---|---|
| `Primary state` renders "—" | `state_province` empty in DB; address parser never tried | Parse `city` → extract 2-letter state code |
| Concept of "primary" state for multi-loc | Single state field can't represent reality | Replace with `operating_states[]` chips (read-only, one per location) |
| `Services offered` shows "—" with chips below | Top value line is empty because chips render outside ConfirmRow's `value` prop | Drop the "—" line; chips ARE the value |
| `Roles in use` same as above | Same | Same |
| `Edit` affordances on derived chips (Services, Roles) | Can't edit here — they mirror catalog/team | Already removed in code; UI polish only |
| No "Confirm everything looks right" affordance at bottom of Step 1 | Operator must scroll to find Next | Add a quiet `All clear · 5 facts confirmed` summary above the footer |

## State derivation (the core fix)

### New helper in `usePolicyProfileDefaults.ts`
```ts
const US_STATE_CODES = new Set(['AL','AK','AZ','AR','CA',...]);
const STATE_NAME_BY_CODE = { AZ: 'Arizona', CA: 'California', ... };

function extractState(loc): string | null {
  // 1. Use state_province if populated
  if (loc.state_province?.trim()) return normalizeState(loc.state_province);
  // 2. Parse city: "Mesa, AZ 85203" or "Gilbert, AZ"
  const cityMatch = loc.city?.match(/,\s*([A-Z]{2})(\s+\d{5})?/);
  if (cityMatch) return cityMatch[1];
  // 3. Parse trailing address: "...Suite 1, Phoenix AZ 85020"
  const addrMatch = loc.address?.match(/\b([A-Z]{2})\s+\d{5}\b/);
  if (addrMatch) return addrMatch[1];
  return null;
}
```

For Drop Dead's data:
- `"Mesa, AZ 85203"` → `AZ`
- `"Gilbert, AZ 85234"` → `AZ`
- Result: `derived_states = ['AZ']` instead of `[]`

### Schema model shift
`policy_org_profile.primary_state` stays (for backwards compat), but the wizard treats it as a **derived display** — operator never picks. New persisted field: **`operating_states: string[]`** populated from `derived_states`. If applicability rules reference `primary_state`, we keep writing it as `derived_states[0]` so nothing breaks downstream.

**Database migration**: add `operating_states text[] not null default '{}'` to `policy_org_profile`. Backfill from `primary_state` for existing rows.

### Wizard UI changes for state row
Replace the editable Select with a read-only multi-state chip row:

```
Operating states                    [no Edit affordance]
[ Arizona ]                         (one chip per detected state)
Detected from your locations. Edit a location to change.
```

If multiple states: `[ Arizona ] [ California ] [ Texas ]` + caption *"Operating in 3 states — applicable policies will respect all jurisdictions."*

If still nothing detected (no city/address either): structural gate as today: *"No location address — set up at least one location."*

## Other Step 1 utility upgrades

### 1. Drop the leading `—` for derived chip rows
Currently `ConfirmRow` renders `value ?? '—'` above the chips. For Services / Roles / Operating states, hide the value line entirely when chips exist below. Cleaner hierarchy.

### 2. Make chips informative, not decorative
- **Services chips** → tooltip on hover: `"12 services in this category"` (we already query the catalog).
- **Roles chips** → tooltip: `"4 active staff with this role"`.
- No new design — pure data attached to existing chips.

### 3. Step 1 confirmation summary
Above the footer, single quiet line: *"5 of 5 facts auto-detected. Edit if anything's wrong, or continue."* — turns Step 1 from "form" to "review".

If anything is missing (structural gate active), it shifts to: *"3 of 5 facts ready. Resolve 2 setup gaps to continue."* and disables Next.

### 4. Extend "auto-detected" reasoning to all heuristic toggles in Step 2
Already partially done (`retail_reason`, etc.) — ensure the labels render consistently and add `team_size_reason: "Based on N active staff"` so Step 2 has parity with Step 1's transparency.

## Files touched

| File | Change |
|---|---|
| `src/hooks/policy/usePolicyProfileDefaults.ts` | Add `extractState()` parser for city/address fallback. Build `derived_states` from extracted values. Add per-category service counts + per-role staff counts (for chip tooltips). |
| `src/components/dashboard/policy/PolicySetupWizard.tsx` | Operating states row: read-only chip multi (no Edit), drop `value` line when chips render. Add Step 1 summary line above footer. Wire chip tooltips. |
| `supabase/migrations/<timestamp>_policy_operating_states.sql` | Add `operating_states text[]` column, backfill from `primary_state` |
| `src/hooks/policy/usePolicyOrgProfile.ts` | Persist `operating_states` on upsert; update applicability filter to use array (with `primary_state` as fallback for legacy rows) |
| `mem://features/policy-os-applicability-doctrine.md` | Append: *"Multi-state orgs apply policies per jurisdiction. `operating_states` is the source of truth; `primary_state` is a legacy mirror."* |

## Out of scope (deferred)

- Per-location policy variance (e.g., AZ tipping policy differs from CA) — surfaces would need per-location overrides; not in this wave
- International support (CA, TX, etc. only — US 2-letter codes for now)
- Editing addresses inline from the wizard — operator goes to Locations settings
- Step 2 toggle UI changes beyond reason-label parity

## Sequencing

1. Migration: add `operating_states` column + backfill.
2. Hook: `extractState()` parser + derived_states from `city`/`address` fallback + chip-count metadata.
3. Wizard: chip-multi state row, drop redundant `value` lines, Step 1 summary.
4. Persistence: write `operating_states` alongside `primary_state` on upsert.
5. Doctrine: memory append.

