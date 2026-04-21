

# Make "Who it applies to" specific per policy

## What you caught

The `Who it applies to` field on Employment Classifications reads:

> *"All team members and, where the policy involves guest interactions, all clients of Drop Dead Salons. Manager-level exceptions follow the documented authority chain below."*

Same boilerplate as every other `generic_shape` policy — and it's wrong here. Employment Classifications is an **internal HR policy** that does not involve guest interactions at all. Mentioning clients is misleading. We just shipped the per-policy applicability manifest (`audienceLocked`, `scopes`, `primaryScope`) — `who_it_applies_to` should derive its default from that same source of truth, so the prose matches the actual scope.

## The fix — derive `who_it_applies_to` from the applicability manifest

Extend `getPolicySummaryDefaults()` (already the per-policy default helper) to also compute a `who_it_applies_to` default by composing a sentence from:

1. **Audience** (from `audienceLocked` + library `audience`): `internal` → "team members", `external` → "clients", `both` → "team members and clients".
2. **Primary lever** (when set): "specifically those who [employment_type / role / location] applies to" — phrased per scope type.
3. **Authority footnote** (only when `authority_role` field exists in the schema): "Exceptions follow the documented authority chain below."

The helper returns a concrete sentence built from the manifest, not a generic template.

### Concrete results

| Policy | Audience | Manifest | Resulting `who_it_applies_to` |
|---|---|---|---|
| `employment_classifications` | internal | primary=employment_type, scopes=[employment_type, location] | *"All team members of {{ORG_NAME}}, organized by employment classification (W-2 full-time, W-2 part-time, 1099 booth-rental). Reclassification follows the documented authority chain below."* |
| `attendance_punctuality` | internal | scopes=[role, employment_type, location] | *"All team members of {{ORG_NAME}} across every role and location. Exception authority follows the chain below."* |
| `tip_pooling` | internal | primary=role, scopes=[role, employment_type, location] | *"All service-providing team members of {{ORG_NAME}}. Eligibility is determined by role and employment classification."* |
| `gift_card_policy` | external | scopes=[audience, location] | *"All clients of {{ORG_NAME}} purchasing or redeeming gift cards across any location."* |
| `pet_policy` | external | scopes=[audience, location] | *"All clients of {{ORG_NAME}} (and accompanying guests) at every location. Service-animal exceptions follow ADA standards."* |
| `cancellation_policy` | external | scopes=[audience, service_category, location] | *"All clients of {{ORG_NAME}} booking services across the configured service categories and locations."* |

The phrasing is composed from the manifest — not authored sentence-by-sentence — so it scales to all 47 policies without 47 hand-written strings.

### Why derive from the manifest, not the starter draft

The starter draft's first paragraph is the **policy summary** (already wired). The starter draft does not consistently say "who it applies to" as its own sentence — that's a configurator-specific question. The applicability manifest is the structured truth: it knows the audience is locked, knows the primary lever, knows which scopes matter. Composing the sentence from that data is cheaper than authoring 47 strings and stays in sync if a manifest changes.

### Composition rules (deterministic)

```
audienceClause   = audienceLocked
                     ? (audience === 'internal' ? 'All team members of {{ORG_NAME}}'
                        : audience === 'external' ? 'All clients of {{ORG_NAME}}'
                        : 'All team members and clients of {{ORG_NAME}}')
                     : 'All team members and, where the policy involves guest
                        interactions, all clients of {{ORG_NAME}}'    ← current default

primaryClause    = primaryScope === 'employment_type'
                     ? ', organized by employment classification'
                     : primaryScope === 'role'
                     ? ', based on role assignment'
                     : primaryScope === 'service_category'
                     ? ', for the configured service categories'
                     : ''

locationClause   = scopes.includes('location') ? ' across every location' : ''   ← omitted when only one location

authorityClause  = schemaHasAuthorityRole ? ' Exceptions follow the documented authority chain below.' : ''

result = audienceClause + primaryClause + locationClause + '.' + authorityClause
```

For multi-location orgs the location clause is "across every location"; single-location orgs get nothing (no need to mention location at all). The composer knows because it's called with the same context the applicability editor already has.

### What stays the same

- `policy_summary` per-policy default (just shipped) — unchanged. Still derived from `STARTER_DRAFTS[key].internal`.
- `interpolateBrandTokens` for `{{ORG_NAME}}` resolution — unchanged.
- `who_it_applies_to` schema field, validation, save behavior — unchanged.
- Operator edits — sacred. Saved values still win (`{ ...interpolated, ...fromBlocks }`).
- Schema's generic `defaultValue` string — kept as the final fallback for any policy without a manifest entry.
- `applicability-relevance.ts` manifest — read, not modified.

## Files affected

- `src/lib/policy/starter-drafts.ts` — extend `getPolicySummaryDefaults(libraryKey, ctx)` to accept `{ category, audience, locationCount, schemaHasAuthorityRole }` and compose `who_it_applies_to` from the applicability manifest. ~40 lines additive (composer + scope-to-phrase map).
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — pass `{ category, audience, locationCount, schemaHasAuthorityRole }` into `getPolicySummaryDefaults`. ~5 lines additive.

That's the entire change surface. No new helper modules, no DB changes, no schema changes.

## Acceptance

1. **Employment Classifications** `Who it applies to` reads: *"All team members of Drop Dead Salons, organized by employment classification. Exceptions follow the documented authority chain below."* — no mention of clients.
2. **Pet Policy** reads: *"All clients of Drop Dead Salons across every location."* — no mention of team members.
3. **Cancellation Policy** reads: *"All clients of Drop Dead Salons across the configured service categories and locations."*
4. **Tip Pooling** reads: *"All service-providing team members of Drop Dead Salons. Eligibility is determined by role and employment classification."*
5. Single-location orgs do not see "across every location" filler.
6. Operators who already saved a custom `who_it_applies_to` continue to see their saved value — defaults never overwrite.
7. Brand token `{{ORG_NAME}}` resolves to the org name via the existing `interpolateBrandTokens` pass.
8. Policies without an applicability manifest entry fall back to the schema's generic default (no regression).

## Doctrine compliance

- **Lever and confidence doctrine**: the field now states the *actual* lever surface (employment classification, role, location) — no fluff about clients on an HR policy.
- **One source of truth**: the applicability manifest is the structured answer to "who does this apply to." Reusing it for the prose default eliminates drift between the two surfaces.
- **Structure precedes intelligence**: the sentence is composed from declared structure (manifest), not authored 47 times.
- **Operator edits are sacred**: saved values continue to win over computed defaults.
- **Brand abstraction**: continues through `interpolateBrandTokens`. No hardcoded tenant references.
- **No structural drift**: zero DB changes, zero new tokens, zero new fields. Pure composer.
- **Persona scaling**: solo operators see two-sentence defaults stripped of multi-location language. Enterprise operators see "across every location" only when they have multiple locations.

## Files to read for follow-on questions

- `src/lib/policy/applicability-relevance.ts` — the structured manifest the composer reads from.
- `src/lib/policy/starter-drafts.ts` — composer lives next to `getPolicySummaryDefaults`.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — the only caller; passes context in.

## Prompt feedback

*"'Who it applies to' is too boilerplate as well. Employment classifications obviously applies to staff and team members of the organization."* — strong follow-up prompt. You did two things well: (1) tied the symptom directly to the prior fix (*"too boilerplate as well"* — explicitly anchoring this to the policy-summary doctrine we just shipped), and (2) named the **specific wrong assumption** in the current text (mentions clients on a staff-only policy). That second move is what made this a 5-minute diagnosis: I didn't have to guess whether the issue was "no per-policy text" or "wrong per-policy text" — you showed me the conceptual mismatch (HR policy → client-facing language).

One sharpener for next time: when two fields have the same flaw, naming whether you want them **derived from the same source** (one composer, one truth) vs **independently authored** (two strings per policy, manually) tells me which architecture to reach for. I went with **derive from the existing applicability manifest** because that manifest *already* answers "who does this apply to" — letting the prose drift from it would be the structural smell. But for a future "this field is also generic" prompt, naming **whether the two fields should share a source of truth or stay decoupled** removes the inference. For this prompt the answer was unambiguous (the manifest is *literally* the structured version of the prose), but on a feature without that prior groundwork, that one-line steer would be the fastest path to the right architectural layer.

