

# Policy OS — Full Audit (Wave 28.10.5 Audit)

Six waves shipped (28.1–28.10.4). Below is a categorized audit of what works, what's broken, what's misleading, and what's missing. Findings carry **Priority** (P0 blocking, P1 should-fix, P2 polish) and a **Doctrine anchor** where applicable. Anchorless findings default to P2.

---

## P0 — Blocking gaps (system silently fails its core promise)

### 1. No "Publish externally" action exists anywhere
**Symptom:** A policy can be adopted → configured → drafted → client variant approved, and the public Policy Center at `/org/:slug/policies` will *still* render nothing for it. `usePublicOrgPolicies` requires `policy_versions.is_published_external = true`, but **no UI mutation ever sets that flag**, and no UI ever moves `policies.status` to `published_external`. The `PolicyHealthStrip` "Published" tile is hard-coded to count statuses that nothing ever assigns.
**Anchor:** Visibility Contracts — silence is valid only when threshold is *operator-controllable*. Today it's silent because the system has no publish button at all.
**Fix:** Add a "Publish to client policy page" toggle in the configurator header (audience external/both only). Mutation flips `policy_versions.is_published_external` + bumps `policies.status` to `published_external`. Disable the toggle until at least one approved `client` variant exists. Show the public URL when on.

### 2. Surface mappings are configured but never consumed
**Symptom:** `PolicySurfaceEditor` lets operators wire policies to surfaces (`booking_confirmation`, `checkout`, `service_card`, etc.). The mappings are saved, conflict-detected, and audit-logged — but **no booking, checkout, scheduler, or POS code reads `policy_surface_mappings`**. Only Handbook OS and the public Policy Center consume policy data, and they don't go through surface mappings at all.
**Anchor:** North Star — "Configure once, render everywhere." Today: configure once, render *almost* nowhere.
**Fix:** Ship a `usePolicyForSurface(surface, context)` hook + a `<PolicyDisclosure surface="..."/>` primitive. Wire at minimum: booking confirmation footer, checkout disclosure card, service card pre-book.

### 3. Status field is dead metadata
**Symptom:** `PolicyStatus` enum has 8 values (`not_started` → `wired`) shown in badges across cards, but **zero code paths mutate it** beyond `adopt_and_init_policy`. Every adopted policy stays at its initial status forever. Health strip counters ("Configured", "Published", "Wired") will read zero indefinitely.
**Anchor:** Lever & Confidence Doctrine — KPIs that don't move are noise.
**Fix:** Auto-promote on the server side via the existing save RPCs:
- `save_policy_rule_blocks` → `configured` (if all required rules present)
- variant approval → `approved_internal` (when internal variant approved)
- new publish action (#1) → `published_external`
- when surface mappings exist on a published version → `wired`

---

## P1 — High-impact gaps & bugs

### 4. Library count mismatch ("47" vs actual 54)
**Symptom:** Page hard-codes "47 recommended policies." DB now has 54 entries. Setup banner also says "47."
**Fix:** Replace hard-coded number with `library.length`.

### 5. No way to unadopt or archive a policy
**Symptom:** Clicking any library card auto-adopts that policy via `adopt_and_init_policy` (line 82–87 of `PolicyConfiguratorPanel`). There is no "Remove" / "Archive" action. Operators who click a card to *read* it will inadvertently adopt it. Adopted count inflates immediately.
**Anchor:** Autonomy Model — "Recommend → Simulate → Approve → Execute." Auto-adopt skips the approve step.
**Fix options:** (a) Don't auto-adopt; show a clear "Adopt this policy" CTA inside the configurator. (b) Add an "Archive" action on the library card and configurator that flips status to `archived`. Recommend both.

### 6. `useResolvePolicyConflict` writes audit log without `version_id` filter integrity
**Symptom:** `useResolvePolicyConflict` updates `policy_surface_mappings` by `(version_id, surface)` pair without enforcing `enabled=true` first — disabling something already disabled writes a duplicate audit row claiming `previous_value: { enabled: true }`. Misleading audit trail.
**Anchor:** Audit findings require accuracy; immutability without truthfulness is worse than no log.
**Fix:** Add `.eq('enabled', true)` to the update; gate audit insert on actual row count change.

### 7. Acknowledgment flag with no `client` variant approved is a footgun
**Symptom:** Operator can toggle "Require client acknowledgment" before any client variant is approved or published. The public center won't show the policy → clients can't acknowledge → required acknowledgment is unsatisfiable, but operator gets no warning.
**Fix:** In `useUpdatePolicyAcknowledgmentFlag`, when enabling, validate (a) audience includes external, (b) at least one approved client variant exists, (c) `is_published_external` is true. Otherwise show a toast: "Approve and publish the client variant first." Surface the same warning inline next to the switch.

### 8. Configurator panel auto-adopts on mount even for read-only browsers
**Symptom:** Same root cause as #5 — `useEffect` on line 82 fires `adopt.mutate(entry.key)` automatically. Combined with `?policy=` URL param, sharing a deep link to a non-adopted policy adopts it on the recipient's account.
**Fix:** Convert auto-adopt to an explicit "Adopt and configure" CTA when `!alreadyAdopted`.

### 9. `PolicyHealthStrip` "Published" / "Wired" tiles bury the meaningful number
**Symptom:** Of four stat tiles, only "Adopted" moves under current code paths. Operators see 0/0/0 perpetually for Configured/Published/Wired and conclude the system is broken.
**Fix:** Either (a) implement #3 so tiles move, or (b) until then, replace dead tiles with operator-relevant counts: "Drafts awaiting approval", "Acknowledgments this month", "Surfaces with conflicts."

### 10. No library search or keyword filter
**Symptom:** 54 policies, no search box. Operators must scroll category tabs to find e.g. "tip pooling" or "minor consent."
**Fix:** Add a search input above the library grid that filters `library` by `title + short_description + key`.

### 11. Public Policy Center has no "Last updated" sort or jump nav with 50+ policies
**Symptom:** When fully populated, public page becomes one long scroll. No category jumplinks, no "Recently updated" indicator beyond the per-card date.
**Fix:** Add a sticky category nav rail; sort policies within group by `approvedAt desc` instead of alphabetical.

---

## P2 — Polish, copy, and UX refinements

### 12. Configurator footer "Save rules" is far from "Save applicability" and "Save surfaces"
Each tab has its own save button at different scroll positions. Operators saving rules then switching tabs lose context. **Fix:** unified footer that reflects the active tab's dirty state, or auto-save on tab change with toast.

### 13. `PolicyConfiguratorPanel` opens at "Rules" even when rules already saved
Returning operators who want to approve drafts have to click through 4 tabs every time. **Fix:** open at the first incomplete step (rules → applicability → surfaces → drafts → publish).

### 14. Conflict banner only shows the first conflict in detail
`PolicyConflictBanner` collapses N conflicts into "+X more." For an org with 5 surface conflicts, only one is visible. **Fix:** show top 3, then "+N more."

### 15. Variant approval doesn't snapshot the body
If operator approves a variant, then edits the body, the edit re-flips approval to false (good) — but the *approved snapshot* is gone. Acknowledgments may have been recorded against a body that no longer exists. **Fix:** when approving, write a snapshot row to `policy_version_variant_snapshots` (new table) that acknowledgments can reference for litigation-grade audit.

### 16. "Client-facing" tone variant uses `<pre>` for body display in drafter
Line 219 of `PolicyDraftWorkspace` renders `body_md` inside `<pre>` with `whitespace-pre-wrap`. For markdown content with headings/lists this renders raw markdown syntax, not formatted. Public center renders it correctly via `ReactMarkdown` — drafter preview should match. **Fix:** swap to `ReactMarkdown` in the drafter card.

### 17. Health strip tile labels collide with tile sub-text
"Adopted / of recommended" and "Configured / rule sets defined" — "Configured" reads as a status, but the sub-text says "rule sets defined." Two different concepts. **Fix:** rename to "Rule sets defined" / "Live to clients" / "Wired to surfaces" so the headline matches the meaning.

### 18. No timezone on acknowledgment timestamps
`PolicyAcknowledgmentsPanel` formats with `toLocaleString(undefined, ...)` — no zone label. CSV export same. For multi-state operators / litigation, this is ambiguous.
**Anchor:** Schedule Unified Mechanics — timezone-safe display rule.
**Fix:** include org timezone abbreviation; CSV export ISO with `+00:00` offset.

### 19. Public center caches acknowledgment locally only
`ACKED_STORAGE_PREFIX` localStorage means clearing browser data wipes the "I acknowledged" UX state. Server-side ack is intact, but the client thinks they need to re-acknowledge. **Fix:** on page load, query `policy_acknowledgments` by stored email and rehydrate the set.

### 20. Setup wizard "Recommended policy set" count includes optional policies
`recommendedKeysForProfile` filters by gating flags (`requires_extensions`, etc.) but doesn't filter by `recommendation = 'optional'`. Operators see "47 recommended" then later realize many were optional. **Fix:** filter to `required + recommended`; show optional separately as "Plus 12 optional you can add anytime."

---

## Policy library content suggestions (operator-business value)

These categories have visible gaps relative to industry reality:

- **Late-arrival policy** (separate from cancellation) — 10/15 minute thresholds, partial-service vs reschedule
- **No-show fee enforcement** — explicit charge-card-on-file authorization, dispute exclusion language
- **Photo & social media consent** — before/after posting, model release for portfolio use
- **Allergy & patch-test policy** — 48-hour patch test for color, liability waiver
- **Pregnancy / medical disclosure policy** — chemical service screening
- **Pet policy** — service animals vs comfort animals (ADA-correct language)
- **Tipping policy** — cash-only, included-in-card, gratuity governance (referenced from staff side as "Tip Distribution")
- **Walk-in policy** — accept/decline criteria, walk-in surcharge, queue order
- **Parking & arrival policy** — for urban locations
- **Weather closure / force majeure** — automatic refund vs credit logic
- **Service satisfaction guarantee window** — separate from Redo Eligibility (sets expectations *before* the redo)
- **Children-in-salon policy** — accompanying minors during a parent's service (liability + space)
- **Phone & device policy** — staff-side and client-side
- **Confidentiality / NDA** — for celebrity / VIP clients
- **Booth rental boundary policy** — for hybrid commission/booth shops

Each maps cleanly to one of the existing six categories.

---

## Doctrine compliance scorecard

| Doctrine | Status | Notes |
|---|---|---|
| Tenant isolation | ✅ | All queries scope by `organization_id`; surface mapping query filters defensively in JS |
| Visibility Contracts | ⚠️ | Public center silent — but for the wrong reason (no publish action, not threshold-driven) |
| Single source of truth | ✅ | One library, one configurator, one drafter |
| Brand neutrality | ✅ | No hardcoded tenant references found |
| Loader unification | ✅ | Uses `tokens.loading.spinner` consistently |
| Typography | ✅ | All headers `font-display`; bodies `font-sans`; no banned weights |
| Audit immutability | ⚠️ | Conflict-resolve audit can write false `previous_value` (#6) |
| Persona scaling | ⚠️ | No solo-vs-enterprise gating; solo operators see all 6 categories |
| Autonomy boundaries | ⚠️ | Auto-adopt on configurator open violates "Recommend → Approve → Execute" |

---

## Recommended fix sequence (Wave 28.11 candidate)

**Wave 28.11.1 — Make publish real (P0):** #1 + #3 + #11. Without this, the public center cannot work for any operator.
**Wave 28.11.2 — Wire to surfaces (P0):** #2. Booking + checkout disclosure consumption.
**Wave 28.11.3 — Lifecycle hardening (P1):** #5 + #7 + #8. Adopt/archive flow + acknowledgment guards.
**Wave 28.11.4 — Polish & content (P1/P2):** #4, #10, #14, #16, #17, #19 + new library entries.

Each ships as its own wave, never bundled. P0s are leverage gates — without them the surrounding intelligence layer does nothing visible to clients.

