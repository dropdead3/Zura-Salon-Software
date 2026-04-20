

## Goal
Required policies tagged as extension-specific (or retail/packages-specific) should not appear as "Required" — or appear at all in the Required section — for operators who don't offer that service. Today, the Setup Wizard already filters by `offers_extensions/retail/packages`, but the **Library grid does not** — so a solo stylist who doesn't do extensions still sees `extension_aftercare_policy`, `extension_warranty_policy`, etc. forced into the bold Required section.

## Investigation
- `policy_library` rows have `requires_extensions`, `requires_retail`, `requires_packages` flags (confirmed in `recommendedKeysForProfile` at `usePolicyOrgProfile.ts:138-145`).
- `usePolicyOrgProfile` returns `offers_extensions / offers_retail / offers_packages` per org.
- `Policies.tsx` filters by audience + category but **never reads the org profile** to filter out non-applicable required policies.
- The Setup Wizard already does this correctly — the Library page is the gap.

## Changes

### 1. `src/pages/dashboard/admin/Policies.tsx` — applicability filter
- Pull `usePolicyOrgProfile()`.
- Add a helper `isApplicableToProfile(entry, profile)`:
  - If `entry.requires_extensions && !profile.offers_extensions` → not applicable
  - Same for retail, packages
  - If profile is null/loading → treat all as applicable (don't hide before we know)
- Apply filter to `filteredLibrary` before partitioning into required/other.
- Add a small **dismissible info chip** at the top of the library when items are hidden:
  > "Hiding 4 extension policies — your business profile says you don't offer extensions. [Edit profile]"
  - Link goes to the Setup Wizard / profile editor
  - Count is dynamic
  - Uses `tokens.body` + muted styling, not an alert

### 2. Demotion vs hiding — operator override
Some operators will want to *see* the hidden ones (e.g., considering adding extensions). Add a quiet toggle in the page header:
- **"Show all"** ↔ **"Hide non-applicable"** (default: hide)
- Small `Switch` or text-link beside the audience filter
- Persists to `localStorage` per org

### 3. Required-count chip honesty
Currently the Required section header shows `(n)` based on raw library count. After filtering, the count reflects only applicable required policies — which is what the operator actually needs to configure. No code change needed beyond using the filtered list.

### 4. Setup Wizard parity check
Verify `recommendedKeysForProfile` in `usePolicyOrgProfile.ts` already excludes these — it does (lines 138-145). No change needed; this PR brings the Library page into parity with the wizard.

## Out of scope
- No DB or library-content changes
- No new domain flags (e.g., `requires_minors`, `requires_memberships`) — those aren't on `policy_library` yet; can be added in a later wave if needed
- No changes to surfaces, configurator, or public center

## Files touched
- `src/pages/dashboard/admin/Policies.tsx` — applicability filter + hidden-count chip + show-all toggle

