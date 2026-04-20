

## Goal
Gate every policy surface behind wizard completion. Until `profile.setup_completed_at` exists, the Policies page renders **only** an intentional intro experience — no health strip, no category grid, no library, no cards. Once the wizard completes, the existing dashboard appears.

## Why this matters
Current state: even with no profile, the page still renders `PolicyHealthStrip`, `PolicyCategoryCard` grid, and the full library underneath the setup banner. The setup banner reads as one nudge among many — operators can scroll past it and start adopting policies their business doesn't actually need. That defeats the entire applicability doctrine we just shipped (four-anchor paired flag system, hidden-by-reason chip, lint surface).

The wizard is the **structural prerequisite** for everything else on this page — same pattern as `gate_commission_model` blocking payroll. The doctrine already supports this (Structural Enforcement Gates).

## Investigation summary

- `Policies.tsx` line 79: `hasProfile = !!profile?.setup_completed_at` — gate already computed, just under-used.
- Lines 175-177: `PolicySetupBanner` only renders when `!hasProfile`, but everything below (lines 178-430) renders unconditionally.
- Wizard infrastructure (`PolicySetupWizard`, Sheet at line 434) is fully built and proven — no changes needed there.
- `PolicySetupBanner` is small and primarily a CTA strip — not designed to carry the full intro narrative we need.

## Changes

### Change A: New `PolicySetupIntro.tsx` component
**New file**: `src/components/dashboard/policy/PolicySetupIntro.tsx`

A single tasteful, pre-wizard intro surface. Replaces the entire post-header content area when `!hasProfile`. Three stacked sections inside one calm container (no card-spam):

**Section 1 — Hero statement**
- Termina eyebrow: `POLICY INFRASTRUCTURE`
- Large headline (font-display): `"Define how your business operates. Once."`
- One-paragraph body (font-sans, muted): explains that policies are the source of truth — once configured here, they render automatically into handbooks, the client policy center, booking flows, checkout decisions, and manager prompts. No duplication, no drift.

**Section 2 — "What setup decides" (3-column grid, no cards — just iconed rows)**
Three short blocks explaining what the wizard captures and why it matters. Each is icon + heading + one-sentence body:
1. **Briefcase** — *Your business shape*. Type, location, team size. Determines which legal frameworks apply (e.g., chair rental disclosures in TX vs CA).
2. **Scissors** — *What you offer*. Services determine which policies are required vs noise. A barbershop won't see extension aftercare. A solo stylist won't see manager escalation.
3. **FileCheck** — *What you already have*. Existing handbooks, waivers, intake forms — we won't ask you to redo what's already in place.

**Section 3 — "How the system uses your policies" (compact 4-row list)**
Anchors expectations — operators see what *changes* downstream once policies are configured. Simple icon + label + one-line explanation:
- **Handbook** — Renders policies as employee-facing prose, versioned and signed.
- **Client policy center** — Public-facing acknowledgments before booking.
- **Checkout & booking** — Manager-decision rules (no-shows, cancellations, deposits) fire automatically.
- **Manager prompts** — Drift alerts when staff actions diverge from policy.

**Section 4 — Single primary CTA**
One large button: `Start setup · 4 steps · ~5 minutes`. Triggers the existing wizard sheet.

Below the CTA, a quiet line: `54 policies in the library. The wizard narrows them to what your business actually needs.` (Pulls live `library.length` so it stays accurate.)

**Voice**: matches brand voice doctrine — calm, declarative, advisory. No "Get started!" hype. No emojis. No gradients or decorative chrome.

**Layout**: single `max-w-3xl mx-auto` column, generous vertical rhythm (`space-y-12`), no glass cards. Just typography and quiet section dividers (`border-t border-border/40`). Termina for headings, Aeonik for body. Max weight `font-medium`.

### Change B: Hard-gate the Policies page content
**File edit**: `src/pages/dashboard/admin/Policies.tsx`

Restructure the render tree:
- If `isLoading` → spinner (unchanged).
- Else if `!hasProfile` → `<PageExplainer pageId="policies" />` + `<PolicySetupIntro onStart={() => setSetupOpen(true)} libraryCount={library.length} />`. **Nothing else.**
- Else → existing dashboard (PageExplainer, HealthStrip, ConflictBanner, By Category, Library — as today).
- Wizard `Sheet` (line 434) and configurator `Sheet` (446) stay mounted at root regardless — they're triggered by state, not by gate.

Remove the now-redundant `<PolicySetupBanner>` render (line 175-177) — `PolicySetupIntro` replaces it. Keep `PolicySetupBanner` file in place (it's used by the gated state's "Update profile" path elsewhere — actually, checking current usage: only Policies.tsx imports it. Will remove the import and leave the file untouched for now to avoid scope creep; can prune in a follow-up).

Update the page header: hide the `Update profile` action button when `!hasProfile` (already does — line 159 conditional). No change needed.

Page header `description` prop should also adapt: when `!hasProfile`, set to `"Configure once. Render everywhere."` — matches the calmer pre-setup state. When `hasProfile`, keep the current longer description.

### Change C: Update doctrine
**File edit**: `mem://features/policy-os-applicability-doctrine.md`

Add a section: **"Wizard is the structural gate."** State that the Policies page must render no policy surfaces (library, health strip, category grid, conflict banner) until `policy_org_profile.setup_completed_at IS NOT NULL`. Mirrors the `gate_commission_model` pattern from the Structural Enforcement Gates doctrine.

This locks in the precedent so future surfaces (Command Center policy tile, daily briefing policy nudges) inherit the same gate.

## Out of scope
- Pruning `PolicySetupBanner` (still used as fallback on other surfaces; defer until audit confirms).
- Modifying the wizard itself — already works.
- Adding a "Skip setup" escape hatch — the whole point is that setup is structural. No skip.
- Changing the URL — staying on `/dashboard/admin/policies` is correct; the gate is content-level, not route-level.
- Notifications/empty-state on Command Center for un-set-up policies (different surface, different wave).

## Files touched
- `src/components/dashboard/policy/PolicySetupIntro.tsx` — new intro component
- `src/pages/dashboard/admin/Policies.tsx` — gate render tree, swap banner for intro, adapt header description
- `mem://features/policy-os-applicability-doctrine.md` — append wizard-as-gate doctrine

## Sequencing
1. Build `PolicySetupIntro` (isolated, no dependencies on page state beyond `onStart` + `libraryCount`).
2. Restructure `Policies.tsx` render tree to hard-gate.
3. Append doctrine.

