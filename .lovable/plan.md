

## Goal
Stop asking the org to re-enter what {{PLATFORM_NAME}} already knows. The wizard becomes a **confirmation + judgment** surface, not a data-entry form. Auto-derive structural facts from existing org data; only ask the operator what the system genuinely cannot infer (intent, audience, existing materials).

## What's wrong with the current wizard
Five questions are re-asking the platform's own data:

| Wizard asks | Platform already knows | Source |
|---|---|---|
| Business type | `organizations.business_type` | `useOrganizationContext().effectiveOrganization.business_type` |
| Primary state | `locations[].state_province` | `useLocations()` — pick primary or distinct list |
| Team size band | `count(employee_profiles)` for org | derive band from active staff count |
| Service categories | distinct categories on `services` table | `useServicesByCategory()` |
| Roles used | distinct `app_role` actually assigned to staff | `user_roles` table for org |

That's 5 of 8 inputs the wizard demands — all answerable from data the operator configured during onboarding. Asking again signals the system isn't paying attention. Operator trust drops.

## What the wizard should actually ask
Three things {{PLATFORM_NAME}} **cannot** derive — they're judgment calls or non-modeled facts:

1. **Business model toggles** — `offers_extensions`, `offers_retail`, `offers_packages`, `offers_memberships`, `serves_minors`. We can *guess* (e.g., retail = inventory exists), but each one has policy stakes (minor consent, retail returns, package expiration). Operator must affirm.
2. **Existing materials** — `has_existing_handbook`, `has_existing_client_policies`. Cannot be derived. Determines whether we draft fresh or adapt.
3. **Confirmation of derived facts** — operator reviews what we pre-filled and corrects anything wrong (e.g., we listed Texas as primary state but the org operates from California now).

## New wizard flow (3 steps, not 5)

**Step 1 — Confirm the basics** *(was: Business + Team + Services + part of Existing)*
Pre-filled from org data. Read-only by default with an inline "Edit" affordance per field if something's wrong. No empty form fields.

Layout (single screen, no sub-steps):
- **Business type**: shows `organization.business_type` as a quiet label. "Edit" reveals the existing dropdown.
- **Primary state**: shows derived from primary location's `state_province`. If multi-location and states differ, shows a multi-select chip group of all states represented (no editing needed — system inferred correctly).
- **Team size**: shows derived band from active staff count (e.g., "Small (2–5) — based on 4 active staff"). Edit reveals the radio.
- **Services offered**: shows derived categories as static chips (e.g., "Cut & style · Color · Treatments — from your service catalog"). Read-only because it mirrors the actual catalog; operator edits the catalog itself, not here.
- **Roles in use**: shows derived role list (e.g., "Stylist · Receptionist · Manager — from your team"). Read-only, same reason.

If the operator has zero staff, zero services, or no location set, that field shows a structural gate inline: *"No locations configured — set up at least one location to capture your operating state."* with a deep link, mirroring the `gate_commission_model` pattern.

**Step 2 — Business model**
The 5 toggles that genuinely require a judgment call. Existing live "what changes" helper stays — this is the wizard's most valuable surface because flips materially change the recommended set.

Pre-fill heuristics (operator can override):
- `offers_retail`: pre-checked if any active retail products in inventory.
- `offers_extensions`: pre-checked if any service category contains "extension".
- `offers_packages`: pre-checked if package products exist (or false default).
- `offers_memberships`: pre-checked if the org has any active membership plans configured.
- `serves_minors`: never pre-checked (can't be inferred, has highest policy stakes).

Each toggle that's pre-checked shows a tiny "auto-detected from your [inventory / services / packages]" label so the operator knows *why* it's on.

**Step 3 — Existing materials + Review**
Merged. Top half: the 2 existing-materials checkboxes (genuinely cannot be derived). Bottom half: the existing review surface — recommended count, breakdown by category, expansion-flips block. Single "Save & adopt N" CTA.

## Why 3 steps instead of 4
Cognitive cost of the wizard now matches its decision payload. Five steps for ~3 real decisions reads as bureaucratic. Three steps where each one has obvious value reads as respectful of the operator's time.

## Step rail and copy adjustments
- New labels: `1 Confirm` · `2 Business model` · `3 Materials & review`
- Step 1 description: "What we know about your business — confirm or correct."
- Step 2 description: "Tell us how you operate — drives which policies apply."
- Step 3 description: "What you already have, and what we'll adopt."
- Drop the sub-headline currently inside step content (e.g., "BUSINESS — Type, location, and team size") — the rail already labels the step. One header per step.

## What the screenshot specifically fixes
The current screenshot shows: "POLICY SETUP" title, then a full empty form asking business type, state, and team size with five empty radio buttons. After the change:
- Title stays "POLICY SETUP"
- Step 1 renders with **all three fields pre-filled** from `organization.business_type` (`salon`), the primary location's state, and the derived team-size band.
- The five empty radio buttons disappear — replaced by a single derived value with an inline "Edit" link.
- Operator's first action becomes "Next" (or click Edit on a field that's wrong), not "Fill out a form."

## New helper: `usePolicyProfileDefaults`
**New file**: `src/hooks/policy/usePolicyProfileDefaults.ts`

Single hook that aggregates:
```ts
{
  business_type, // from organization
  primary_state, // from primary location
  derived_states, // distinct list across all locations (multi-loc orgs)
  team_size_band, // derived from active employee_profiles count
  team_size_count, // raw count for display ("based on 4 active staff")
  service_categories, // distinct from services table
  roles_used, // distinct from user_roles for this org
  // heuristic toggle defaults
  detected_offers_retail, // true if any retail products
  detected_offers_extensions, // true if any service category includes "extension"
  detected_offers_packages, // true if any active package products
  detected_offers_memberships, // true if any active membership plan
  // structural gates
  needs_location_setup: boolean,
  needs_services_setup: boolean,
  needs_team_setup: boolean,
}
```

Wizard merges this with `existingProfile` (existing always wins — operator's prior overrides are preserved) before initializing form state.

Team-size band thresholds (matches existing `TEAM_SIZE_BANDS`):
- 1 → solo
- 2-5 → small
- 6-15 → medium
- 16-40 → large
- 40+ → enterprise

## Files touched
- `src/hooks/policy/usePolicyProfileDefaults.ts` — **new**, derives all auto-fillable fields
- `src/components/dashboard/policy/PolicySetupWizard.tsx` — collapse 5 steps → 3, swap Step 1 inputs for confirm-and-correct rows, pre-seed Step 2 toggles from heuristics with "auto-detected" labels, merge "existing materials" into review step
- `src/lib/handbook/brandTones.ts` — no change (still source of truth for `US_STATES`, `ROLE_OPTIONS`)
- `mem://features/policy-os-applicability-doctrine.md` — append section: **"Wizard inputs must be derived-by-default."** Asking the org to re-enter platform-known data is a doctrine violation. Wizard prompts only for what {{PLATFORM_NAME}} cannot infer.

## Out of scope
- Modifying `policy_org_profile` schema (current columns are sufficient — we just populate them differently)
- Changing `recommendedKeysForProfile` or the applicability layer
- Rewriting the existing live "what changes" helper on Step 2 (it stays — high-value)
- Designing the inline edit affordance as a separate sheet/modal — using simple disclosure (click "Edit" → field becomes editable in place)
- Updating other surfaces that read `policy_org_profile` (no contract changes)

## Sequencing
1. Build `usePolicyProfileDefaults` with all five derivations + heuristic flags + structural-gate booleans.
2. Restructure wizard: collapse step order to 3, build the new Step 1 confirm-and-correct UI, wire pre-seeded Step 2 toggles with "auto-detected" labels.
3. Append doctrine entry.

