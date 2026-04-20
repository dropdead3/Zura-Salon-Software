

# Policy OS — Wave 28.11.3.5 Audit (post-audience-aware-configurator)

Wave 28.11.3 shipped the audience-aware configurator, library audience filter, and `PolicyAudienceBanner`. The mental model is now correctly split. **What changed in the gap map:** four findings closed, three new findings emerged from the split itself, and the carry-forward P1s are unchanged. Below — current deltas only.

---

## Closed since last audit
- Internal vs external collapsed into one shape → split via tab-visibility + audience banner.
- Library has no audience navigation → segmented control with live counts shipped.
- Stacked Publish + Require-ack toggles → consolidated under audience banner.

## Still P0

### 1. Auto-adopt on configurator open (carry-forward, now 4 audits old)
`PolicyConfiguratorPanel.tsx:84-89` still mutates `adopt` from `useEffect`. **Critical now that the library is segmented**: an operator browsing the new "Internal" tab to research handbook options silently adopts every card they tap. The audience filter makes this *more* damaging because operators are now incentivized to explore.
**Fix:** gate the configurator body behind an explicit "Adopt and configure" CTA when `!alreadyAdopted`. Show the schema/why-it-matters as read-only preview above the CTA.

### 2. Surface mappings cross the audience boundary (NEW)
`SURFACE_META` in `usePolicyApplicability.ts:154-207` lists 7 surfaces with no `audience` tag. `PolicySurfaceEditor` lets an operator wire a `team` policy to `booking_confirmation`. The new audience banner explicitly tells the operator "This policy isn't shown to clients" — but the Surfaces tab (when `audience='both'`) silently allows it anyway. Worse: `usePolicyForSurface` line 85-92 only gates client-facing surfaces by `is_published_external`, so internal surfaces render any wired policy regardless of audience match.
**Fix:** add `audience: 'internal' | 'external' | 'both'` to `SURFACE_META`; filter the Surfaces tab's candidate list by intersection with the policy's audience; in `usePolicyForSurface`, drop mappings whose policy audience doesn't include the surface's audience.

## Still P1 (carried)

3. **No archive / unadopt path** — `archived` exists in enum, no UI surfaces it.
4. **Ack flag preconditions absent** — `useUpdatePolicyAcknowledgmentFlag` accepts toggle without validating audience/approved-variant/published. The new banner now shows the toggle next to a publish toggle that *is* gated; the inconsistency is visible.
5. **`useResolvePolicyConflict` writes false audit rows** — needs `.eq('enabled', true)` guard before logging.
6. **Variant approval doesn't snapshot body** — past acks reference mutable text; `policy_variant_snapshots` table needed.
7. **`usePolicyForSurface` falls back `disclosure → client` silently** — needs an inline "Using client variant" hint in the Surfaces tab.

## New from 28.11.3 itself

### 8. Drafts tab doesn't filter by audience
`PolicyDraftWorkspace` renders all 4 variant types (internal / client / disclosure / manager_note) for every policy. For an `audience='internal'` policy, the operator now sees a "Client" variant card next to a banner that says "isn't shown to clients." Direct contradiction.
**Fix:** filter drafter cards by audience: internal → `internal` + `manager_note`; external → `client` + `disclosure`; both → all four.

### 9. Banner reserves "Staff acknowledgment" space without delivery
`PolicyAudienceBanner.tsx:146-153` shows "Staff acknowledgment & role assignment ship in the next wave" for every internal/both policy. That's 26 policies (23 internal + 3 both) × every visit = a permanent "coming soon" footer until 28.11.4. Doctrine says silence > false promise; this is the opposite.
**Fix:** remove the placeholder until the wave lands; the Applicability tab already implies the role-targeting story.

### 10. Internal-only acks tab is hidden but historical client acks aren't migrated
`showAcknowledgmentsTab = !isInternalOnly` (configurator line 164). Correct for new policies. **But:** if an operator changes a policy's audience from `both` → `internal` (no UI for this yet, but server allows), historical client acknowledgment data becomes orphaned and invisible. Audit immutability says historical acks must remain accessible.
**Fix:** show the acks tab whenever there's at least one historical row, regardless of current audience. Add a banner: "Audience changed; historical client acks preserved."

## P2 (carried — unchanged scope)

11. Drafter `<pre>` markdown preview (`PolicyDraftWorkspace.tsx:219-221`)
12. Configurator opens at "Rules" — should open at first incomplete step
13. Conflict banner shows only one detail in expanded form
14. No library search input (54 items, audience filter helps but keyword search still missing)
15. Acknowledgment timestamps lack timezone label
16. Public center ack state localStorage-only (clearing browser → re-prompts when server has the row)
17. Public center has no sticky category nav
18. Setup wizard counts include optional in "recommended"
19. `<PolicyDisclosure />` correctly returns null on empty (verified line 66) — finding from prior audit closed

---

# Section A — Configurator organization: what 28.11.3 didn't finish

The audience split landed at the *tab visibility* layer. It didn't land at three deeper layers. Each is small but compounding.

## Layer 1 — Header information density (SHIPPED ✓)
Audience banner consolidated 3 toggles into 1 contextual block. Working.

## Layer 2 — Surface boundary (NOT SHIPPED → finding #2)
Audience metadata stops at the configurator chrome. The data layer (`SURFACE_META`, `usePolicyForSurface`) doesn't know an internal policy can't render to a client surface. Result: operator can wire it, the system honors it, the audience banner contradicts it.

**Recommended:** tag every surface with its valid audience(s):

```text
handbook       → internal
sop            → internal
manager        → internal
client_page    → external
booking        → external
checkout       → external
intake         → external (with optional internal mirror for SOP)
```

Then `PolicySurfaceEditor` filters candidates by `policy.audience ∩ surface.audience`. Single source of truth.

## Layer 3 — Drafts tab variant filter (NOT SHIPPED → finding #8)
Same shape as Layer 2 but for the 4 tone variants. An internal policy should never offer a "Client tone" draft. The variant types map cleanly:

```text
internal       → internal, manager_note
external       → client, disclosure
both           → all four (operator chooses)
```

## Recommended structural follow-up: collapse banner placeholder (#9)
The "coming in next wave" footer in the audience banner is the only piece of the new UI that violates the silence-doctrine. Remove until 28.11.4 lands the staff-ack flow. Net code change: 9 lines deleted.

---

# Library content gaps (verified against current DB — all 12 still missing)

Confirmed via DB query: zero of these exist as `library_key`. Same list as last audit — schema work has not started:

`allergy_patch_test_policy`, `pregnancy_disclosure_policy`, `tipping_policy`, `walk_in_policy`, `weather_force_majeure_policy`, `phone_device_policy`, `confidentiality_nda_policy`, `booth_rental_boundary_policy`, `service_satisfaction_window_policy`, `parking_arrival_policy`, `tip_pooling_policy`, `minor_consent_policy`.

Suggest batching these into 28.11.6 with full configurator schemas + seed variants. Library jumps 54 → 66.

---

# Doctrine scorecard (delta vs prior audit)

| Doctrine | Status | Δ |
|---|---|---|
| Persona scaling | ⚠️ | ↑ tab visibility split shipped, surface/variant layers still leak (#2, #8) |
| Autonomy boundaries | ⚠️ | unchanged — auto-adopt still present (#1) |
| Visibility Contracts | ⚠️ | new violation — banner placeholder is "false promise" (#9) |
| Audit immutability | ⚠️ | unchanged — conflict-resolve inaccurate (#5); audience change orphans acks (#10) |
| Single source of truth | ⚠️ | new — audience exists in policy data, missing from surface/variant data (#2, #8) |

---

# Recommended fix sequence

| Wave | Priority | Scope |
|---|---|---|
| **28.11.4 — Audience boundary completion** | P0 | #2 surface audience tagging + #8 drafter variant filter + #9 banner cleanup |
| **28.11.5 — Lifecycle hardening** | P1 | #1 adopt CTA + #3 archive + #4 ack guard + #5 audit accuracy + #7 fallback signal + #10 historical ack visibility |
| **28.11.6 — Variant snapshots** | P1 | #6 snapshot table + acknowledgment reference rewrite |
| **28.11.7 — Polish & content** | P2 | #11–#18 + 12 missing library entries |

P0s never bundled. **28.11.4 reorders to "audience boundary completion" rather than "lifecycle hardening" because the split shipped in 28.11.3 is incomplete at the data layer — finishing it before adding lifecycle features prevents the new lifecycle code from inheriting the same boundary leak.**

---

# Prompt feedback

**What worked:** Re-running the same prompt after each wave creates a clean delta-tracking rhythm. Each audit can lean on the previous as a baseline, which is why this one runs ~30% shorter than 28.11.2.5 — most carry-forwards just need one-line restatement.

**To tighten next time:** You're now in a stable audit cadence. Two upgrades worth trying:
1. **"Audit only what 28.11.3 changed"** — would have produced a 4-finding focused report instead of restating the carry-forwards. Tradeoff: you lose the "still open" visibility.
2. **"Audit and propose the next wave's scope as a one-paragraph charter"** — would let me end with implementation-ready scope rather than a roadmap table. Best when you know the next wave is approved and want to ship.

The current framing is best when you want both surveillance (what's still broken) and direction (what to ship next). Keep using it through 28.11.6; switch to scoped framing once the P0s clear.

