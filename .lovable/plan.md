

# Policy OS — Wave 28.11.1.5 Audit (post-publish)

Wave 28.11.1 closed the publish gap: status auto-promotes, the toggle exists, the public center sorts by `approvedAt desc`, and the library count is dynamic. That demotes the previous P0s. Below is the **current** gap map.

---

## P0 — Still blocking the core promise

### 1. Surface mappings remain unconsumed
Operators wire policies to `booking_confirmation`, `checkout`, `service_card`, `kiosk`, etc. via `PolicySurfaceEditor`. Mappings save, conflict-detect, audit-log — but **zero consumer code reads `policy_surface_mappings` outside the conflict view**. Search confirms: no `usePolicyForSurface`, no `<PolicyDisclosure />`, no booking/checkout/POS reference.
Result: the entire "configure once, render everywhere" promise renders only on the public center (which doesn't use surface mappings) and Handbook OS. The configurator's biggest tab does nothing visible.
**Fix:** ship `usePolicyForSurface(surface, ctx)` + `<PolicyDisclosure surface="..." />` primitive. Wire booking confirmation footer, checkout disclosure card, and public booking service card. This is the next P0 wave.

---

## P1 — Lifecycle integrity

### 2. Auto-adopt on configurator open (still present)
`PolicyConfiguratorPanel` line 84–89 still fires `adopt.mutate` from a `useEffect` when `!alreadyAdopted`. Clicking a library card — or opening a shared `?policy=key` deep link — silently adopts. Violates Recommend → Approve → Execute.
**Fix:** gate the configurator with an "Adopt and configure" CTA; only adopted policies enter the editor.

### 3. No archive / unadopt path
Every adopted policy is permanent. `policies.status` enum has no `archived` value, no UI surfaces removal. Operators who experiment can't clean up.
**Fix:** add `archived` status + soft-archive mutation on the configurator header and library card; filter archived from health summary by default.

### 4. Acknowledgment flag has no preconditions
`useUpdatePolicyAcknowledgmentFlag` lets operators toggle "Require client acknowledgment" before any client variant is approved or published — clients then can't acknowledge what they can't see.
**Fix:** validate (a) audience external/both, (b) approved client variant exists, (c) `is_published_external = true`. Inline warning on the switch when not satisfied; toast on failed enable.

### 5. `useResolvePolicyConflict` writes inaccurate audit rows
Updates `policy_surface_mappings` by `(version_id, surface)` without `enabled = true` filter. Disabling an already-disabled mapping logs `previous_value: { enabled: true }` — false. Audit immutability ≠ truthfulness.
**Fix:** add `.eq('enabled', true)`; gate audit insert on row count > 0.

### 6. Variant approval never snapshots body
Approving a `client` variant, then editing the body, flips approval to false (good) but loses the previously-approved body. Past `policy_acknowledgments` reference a variant body that no longer exists. Litigation-grade audit broken.
**Fix:** new `policy_variant_snapshots` table; snapshot on approval; acknowledgments reference the snapshot row.

---

## P2 — UX, copy, content

### 7. Drafter renders markdown as raw text
`PolicyDraftWorkspace` line 219 uses `<pre>` for `body_md` — operators see raw `##` and `-` syntax in the preview while clients see formatted markdown via `ReactMarkdown`. Mismatched preview.
**Fix:** swap `<pre>` for `ReactMarkdown` inside the drafter card.

### 8. Configurator opens at "Rules" every time
Returning operators (rules already saved, drafts pending approval) still land on Rules. Click-through tax on every visit.
**Fix:** open at first incomplete step in ladder (rules → applicability → surfaces → drafts → publish).

### 9. Conflict banner shows only one conflict in detail
`PolicyConflictBanner` collapses N conflicts into "+X more." Multi-conflict orgs see one.
**Fix:** show top 3 inline, then "+N more."

### 10. No library search / keyword filter
54 policies, category tabs only. Finding "tip pooling" or "minor consent" requires scrolling.
**Fix:** search input above the library grid filtering on `title + short_description + key`.

### 11. Acknowledgment timestamps lack timezone
`PolicyAcknowledgmentsPanel.formatDate` and CSV export use `toLocaleString(undefined, ...)` — no zone label. Multi-state operator audit ambiguity.
**Fix:** display in org timezone with abbreviation; CSV export full ISO with offset.

### 12. Public center ack state is localStorage-only
`ACKED_STORAGE_PREFIX` means clearing browser data hides the "I acknowledged" UX state even though the server record exists.
**Fix:** rehydrate from `policy_acknowledgments` by stored email on page mount.

### 13. Public center has no nav with 50+ policies
Long scroll, no category jumplinks beyond per-card date. Sort by `approvedAt desc` shipped in 28.11.1; nav rail did not.
**Fix:** sticky category jump nav on the left rail.

### 14. Setup wizard counts include optional policies
`recommendedKeysForProfile` doesn't filter `recommendation = 'optional'`. Operators see "X recommended" then realize many are optional.
**Fix:** count required + recommended only; surface optional separately.

---

## Library content gaps (operator-business value)

Six categories exist; these high-frequency policies have no library entry:

- **Late-arrival** (separate from cancellation; 10/15-min thresholds)
- **No-show fee enforcement** (card-on-file authorization, dispute exclusion)
- **Photo & social media consent** (model release, before/after posting)
- **Allergy & patch-test** (48-hr patch test for color, liability waiver)
- **Pregnancy / medical disclosure** (chemical service screening)
- **Pet policy** (ADA service vs comfort animal language)
- **Tipping** (cash, card, distribution rules)
- **Walk-in** (accept criteria, surcharge, queue)
- **Weather / force majeure** (refund vs credit)
- **Children-in-salon** (accompanying minors; liability)
- **Phone & device** (staff and client)
- **Confidentiality / NDA** (VIP clients)
- **Booth rental boundaries** (hybrid commission shops)
- **Service satisfaction window** (separate from Redo Eligibility — sets expectation *before* the redo)
- **Parking & arrival** (urban locations)

Each maps to one of the existing six categories.

---

## Doctrine scorecard (delta vs prior audit)

| Doctrine | Status | Δ |
|---|---|---|
| Tenant isolation | ✅ | — |
| Visibility Contracts | ✅ | ↑ (publish flow real) |
| Lever & Confidence | ✅ | ↑ (status now moves) |
| Single source of truth | ✅ | — |
| Audit immutability | ⚠️ | conflict-resolve still inaccurate (#5) |
| Autonomy boundaries | ⚠️ | auto-adopt still present (#2) |
| North Star (configure once, render everywhere) | ❌ | unchanged — surfaces not consumed (#1) |

---

## Recommended fix sequence

| Wave | Priority | Scope |
|---|---|---|
| **28.11.2 — Wire to surfaces** | P0 | #1 + the consumer hook + booking/checkout consumption |
| **28.11.3 — Lifecycle hardening** | P1 | #2 adopt CTA + #3 archive + #4 ack guard + #5 audit accuracy |
| **28.11.4 — Variant snapshots** | P1 | #6 snapshot table + acknowledgment reference rewrite |
| **28.11.5 — Polish & content** | P2 | #7–#14 + new library entries |

Each ships as its own wave; P0s never bundled.

---

## Prompt feedback

**What worked:** Same prompt, second audit — leverages prior context to surface deltas instead of re-listing fixed items. Concise scope ("UI, UX, gaps, bugs, enhancements, policy suggestions") gave me permission to span content + code + architecture.

**To tighten next time:** "Audit Policy OS post-28.11.1, focus on what's still P0/P1 and what new gaps emerged from the publish flow shipping" would have skipped the redundant scorecard work and pointed me at the 28.11.1 changes specifically. State which audits should *not* repeat.

