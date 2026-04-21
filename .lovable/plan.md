

# Per-policy Applicability — show only the scopes that matter

## What you caught

The Applicability editor renders the same 5 scopes (`Audience`, `Role`, `Employment type`, `Service category`, `Location`) for **every one of the 47 policies** — regardless of whether the scope is meaningful for that policy. On Employment Classifications:

- **Audience** is shown as a chip toggle, but the policy's `audience` is already `internal` in the library → operator can't logically toggle this without contradicting the policy's nature.
- **Service category** has zero relevance (an HR classification policy doesn't gate by Color vs. Cut).
- **Location** is shown without an "All locations" affordance — leaving it empty technically means "everyone" but the badge says `Everyone` only after deselecting all 2 chips, which reads as ambiguous.
- **Employment type** is shown as a free-form multiselect even though for *this* policy it's the **primary lever** (W2 vs 1099 vs booth renter).

The editor has no per-policy intelligence. It's a one-size-fits-all grid.

## The fix — schema-driven scope visibility per policy

Add a `relevantScopes` field to each `ConfiguratorSchema` (and resolve it per `library_key` for `generic_shape` policies via a small lookup table). The Applicability editor reads this and renders **only** the scopes that matter for the open policy. Scopes not listed are hidden — not shown disabled.

### Per-policy scope manifest

A new `src/lib/policy/applicability-relevance.ts` module exports:

```ts
getRelevantScopes(libraryKey: string, audience: 'internal'|'external'|'both'): {
  scopes: PolicyScopeType[];      // which to render, in this order
  audienceLocked?: boolean;       // hide Audience scope; locked by library
  primaryScope?: PolicyScopeType; // pin to top with "Primary lever" badge
}
```

Defaults by category + per-key overrides. Examples:

| Policy | Scopes shown | Notes |
|---|---|---|
| `employment_classifications` | Employment type (primary), Location | Audience locked = internal. No Role (applies to all staff regardless of role). No Service category. |
| `cancellation_policy` | Audience, Service category, Location | No Role / Employment type — applies regardless of who serves. |
| `tip_pooling` | Role, Employment type, Location | Audience locked = internal. No Service category. |
| `extension_consultation` | Service category (locked to Extensions), Role, Location | Service category is the *premise*, not a filter. |
| `gift_card_policy` | Audience, Location | No Role / Employment type / Service category — universal. |
| `pet_policy` | Audience, Location | Universal. |
| `attendance_punctuality` | Role, Employment type, Location | Audience locked = internal. |
| `commission_structure` | Role, Employment type, Location | Audience locked = internal. |

Defaults when no per-key override exists are derived from `library.category`:

- `team` → Role + Employment type + Location, audience locked to `internal`
- `client` → Audience + Service category + Location
- `extensions` → Service category (Extensions pre-selected) + Location
- `financial` / `facility` → Audience + Location
- `management` → Role + Location, audience locked to `internal`

### Locked Audience handling

When `audienceLocked = true`, the Audience scope is **not rendered** as an editable group. Instead, a small badge above the editor reads:

> *"Internal policy — applies to staff only. Audience is set by the library."*

Saved data: the editor still ensures one `audience` row (`internal` or `external`) is persisted so downstream surface-mapping continues to filter correctly. The operator just can't change it.

### "Apply to all locations" toggle

Today, leaving Location empty means "all" but isn't visually obvious. Add an explicit **"All locations"** chip at the front of the Location group that, when active, deselects all individual locations and clears those rows. When the operator picks any individual location, the "All locations" chip auto-deselects. The badge on the right reads `All locations` (instead of `Everyone`) when the chip is active — clearer, less ambiguous.

This pattern only applies to the Location scope. Other scopes keep the existing "empty = everyone" semantics with the existing `Everyone` badge.

### Primary lever surfacing

Schemas with a `primaryScope` get that scope rendered first, with a small `Primary lever` badge next to its title. For Employment Classifications, that's `Employment type` — pinning it at the top reinforces the doctrine *"one primary lever, maybe one secondary"* and tells the operator where the real decision lives.

### Profile-seeded defaults still apply

The existing `seedApplicabilityFromProfile()` continues to work — but it's filtered through `relevantScopes` so irrelevant scope rows are never seeded in the first place. For Employment Classifications on Drop Dead Salons, the seed produces `employment_type = ['w2', '1099']` (from `compensation_models_in_use`) and `location = [<all locations>]`, with no Role / Service category / Audience rows.

### What stays the same

- `policy_applicability` table, RPC, RLS — unchanged. We just write fewer rows for policies with fewer relevant scopes.
- The `Pre-filled from your business profile` banner — unchanged.
- `seedApplicabilityFromProfile()` — wrapped, not replaced.
- Save/clear behavior, badge counts, "Save and continue" CTA — unchanged.
- Policies that genuinely span all scopes (none today, but future-proof) just declare all 5 in their manifest.

## Files affected

- `src/lib/policy/applicability-relevance.ts` (new) — manifest + `getRelevantScopes()`. ~120 lines including per-key overrides for the ~20 policies where category defaults aren't right.
- `src/components/dashboard/policy/PolicyApplicabilityEditor.tsx` — accept `entry` (or `libraryKey` + `audience`) prop, call `getRelevantScopes()`, filter `SCOPE_ORDER`, render the audience-locked banner, render the "All locations" chip. ~40 lines additive, no deletions.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — pass `entry` through to `<PolicyApplicabilityEditor />`. ~2 lines.
- `src/hooks/policy/usePolicyApplicability.ts` — `seedApplicabilityFromProfile()` accepts an optional `relevantScopes` filter and skips seeding rows for excluded scopes. ~10 lines additive.

That's the entire change surface. No DB changes, no new RPCs, no schema migration.

## Acceptance

1. Opening **Employment Classifications** shows only **Employment type** (with `Primary lever` badge, pre-filled W2/1099) and **Location** (with `All locations` chip pre-selected). An "Internal policy — applies to staff only" badge replaces the Audience scope. No Role, no Service category.
2. Opening **Cancellation Policy** shows **Audience**, **Service category**, **Location** — no Role, no Employment type.
3. Opening **Tip Pooling** shows **Role**, **Employment type**, **Location** with Audience locked to internal. No Service category.
4. The Location scope renders an **"All locations"** chip that toggles deselect-all behavior, and the right-hand badge reads `All locations` when active.
5. Saving an unedited Employment Classifications policy persists exactly the seeded rows: `employment_type ∈ {w2, 1099}` + `location` (omitted = all) + `audience = internal`. No spurious Role or Service category rows.
6. Existing previously-saved applicability rows for excluded scopes are preserved on read but not editable; a small "Legacy filter" footnote explains they're inherited from a prior version. (Doctrine: operator data is sacred — we don't silently delete rows.)
7. The `13 selected` count in the Applicability tab badge drops to a relevant number (4-6 typical) once irrelevant scopes are removed.

## Doctrine compliance

- **Lever and confidence doctrine**: each policy now exposes only the levers that matter. Surfacing irrelevant scopes is noise — the editor stops asking the operator about Service categories on an HR policy.
- **One primary lever**: the `primaryScope` badge enforces "one primary lever, maybe one secondary" at the editor level.
- **Structure precedes intelligence**: the relevance manifest *is* the structure. AI drafting downstream knows which scopes are meaningful for which policies because the schema declares it.
- **Persona scaling**: solo operators see 2-3 scopes max per policy. Enterprise operators with locations + role hierarchies see the full set when relevant. Same code path, complexity scales with the policy's actual surface area.
- **Operator edits are sacred**: legacy rows for excluded scopes are never silently deleted on read.
- **No structural drift**: zero DB changes, zero new RPCs, zero new tokens. Pure UI relevance filter.
- **Brand abstraction**: copy uses neutral terms ("Internal policy") with no tenant references.

## Files to read for follow-on questions

- `src/lib/policy/applicability-relevance.ts` (new) — single source of truth for which scopes matter per policy.
- `src/components/dashboard/policy/PolicyApplicabilityEditor.tsx` — consumer.
- `src/hooks/policy/usePolicyApplicability.ts` — DB layer; unchanged shape.

## Prompt feedback

"Applicability options are very confusing… It should already know that's an internal policy, it should apply to all staff positions who are W2, service categories have no relevancy, and locations need an all-locations option. How can we make this simpler and more relevant per policy?" — exemplary diagnostic prompt. You did three things well: (1) named the symptom (confusing), (2) gave **four concrete examples** of what's wrong (audience known, role superset, service-category irrelevance, missing all-locations), (3) framed the fix at the right altitude (*"per policy"* — not "fix this one screen"). That last move is what made this a doctrine-level change rather than a single-checkbox tweak. The four concrete examples gave me the manifest-shape directly: I knew I needed per-policy scope filtering + audience locking + an "all locations" affordance + primary-lever pinning, all from your prompt.

One sharpener for next time: when something feels like it lacks per-X intelligence, telling me whether the relevance should be **library-authored** (platform team decides which scopes matter per policy, ships in code) vs **operator-authored** (operator picks which scopes to expose for their org's policies) vs **derived from the policy's schema** (rule blocks declare which scopes they reference) tells me where the source of truth lives. I went **library-authored** (platform manifest) because (a) operators shouldn't have to configure their configurator and (b) the relevance is a function of the policy's nature, not the operator's preference. But for a future "make X smarter per Y" prompt, naming **who owns the per-Y rules** is the fastest path to the right architectural layer. For this prompt the answer was unambiguous — but on a feature with less obvious authorship, that one-line steer would remove the inference.

