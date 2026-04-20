

# Policy OS — Wave 28.11.4.5 Audit (post-audience-boundary)

Wave 28.11.4 closed the data-layer leak: `SURFACE_META` carries audience tags, `usePolicyForSurface` enforces audience intersection at runtime, `PolicySurfaceEditor` and `PolicyDraftWorkspace` filter candidates by audience, and the banner "coming soon" placeholder is gone. **The audience split is now coherent across every layer.** New audit below.

---

## Closed since 28.11.3.5
- Surface mappings cross audience boundary → enforced in `SURFACE_META` + consumer filter
- Drafts tab shows wrong variant types for audience → variant cards filter by audience
- Banner "Staff acknowledgment ships next wave" placeholder → removed (silence doctrine restored)

## Still P0

### 1. Auto-adopt on configurator open (5 audits old)
`PolicyConfiguratorPanel.tsx:84-89` still mutates `adopt` from `useEffect` on mount. With the audience filter shipped, exploration is *encouraged* — every internal/external/both card click silently writes to `policies`. Highest-priority lifecycle gap.
**Fix:** gate body behind explicit "Adopt and configure" CTA when `!alreadyAdopted`. Show schema preview (rules + why-it-matters) above the CTA so operators can evaluate before committing.

## Still P1 (carried — same 6 items, none closed)

2. **No archive/unadopt path** — `archived` exists in `POLICY_STATUS_META` (line 99 `usePolicyData.ts`) but no UI surfaces it.
3. **Ack flag preconditions absent** — `useUpdatePolicyAcknowledgmentFlag` accepts toggle without validating audience/approved-variant/published. Visible inconsistency next to the gated publish toggle in the audience banner.
4. **`useResolvePolicyConflict` writes false audit rows** — needs `.eq('enabled', true)` guard before logging.
5. **Variant approval doesn't snapshot body** — `policy_acknowledgments` reference mutable text. Litigation risk.
6. **`usePolicyForSurface` falls back `disclosure → client` silently** (line 154-157) — operator gets no signal their tone choice was overridden. Add inline "Using client variant" hint in Surfaces tab.
7. **Historical client acks orphaned if audience changes `both`→`internal`** — acks tab is hidden for internal-only audience (line 164). Show whenever ≥1 historical row exists.

## New from 28.11.4 itself

### 8. `intake` surface tagged `audience: 'both'` but defaults to `client` variant
`SURFACE_META.intake` (line 209-216) accepts both audiences but `defaultVariant: 'client'` — so an internal-only policy wired to intake auto-seeds with a variant type the audience filter then strips. Operator sees "intake enabled" with no rendered body.
**Fix:** for `audience: 'both'` surfaces, compute the seeded `defaultVariant` per-policy: `policy.audience === 'internal' ? 'internal' : 'client'`.

### 9. Draft workspace `<pre>` preview still raw (line 232-234)
Carry-forward from 28.11.2.5 (#11) but now more visible because the audience-filtered card list draws the eye to fewer cards — the markdown noise per card stands out more.
**Fix:** swap `<pre>` for `<ReactMarkdown>` inside the preview block.

### 10. No "Audience: internal" hint on library cards
`PolicyLibraryCard` shows category + adoption state but not audience. After 28.11.3 added the segmented audience filter, operators expect audience to be visible at the card level too — currently they have to open the card or read the title to infer it.
**Fix:** small audience pill on the card (Internal / Client / Both), color-keyed to the banner palette.

## P2 (carried — unchanged scope)

11. Configurator opens at "Rules" — should open at first incomplete step
12. Conflict banner shows only one detail in expanded form
13. No library search input (54 items; audience filter helps but keyword search still missing)
14. Acknowledgment timestamps lack timezone label
15. Public center ack state localStorage-only
16. Public center has no sticky category nav
17. Setup wizard counts include optional in "recommended"
18. `viewfunctions tooltip` (`PolicyAudienceBanner` "Live" badge) — only shows for `external` audience; `both` audience policies that publish externally also need the badge

---

# Section A — Configurator organization: Wave 28.11.4 closed Layer 2 + Layer 3

The 4-layer model from prior audits:

| Layer | Status |
|---|---|
| 1. Header info density | ✅ Shipped (28.11.3) |
| 2. Surface boundary (data) | ✅ Shipped (28.11.4) |
| 3. Drafts variant filter | ✅ Shipped (28.11.4) |
| 4. **Lifecycle** (adopt/archive/snapshot) | ❌ **Next wave** |

**The structural split is complete.** What remains is lifecycle — the verbs of `adopt`, `archive`, `snapshot`, `migrate-audience`. These are the next fault line.

## New design problem surfaced by 28.11.4

The audience banner now does its job perfectly for `internal` and `external` policies. **`both`-audience policies (3 today: `cancellation_policy`, `tip_pooling_policy`, `service_redo_policy`) suffer the opposite problem from before:** the banner shows *all* toggles stacked, the surfaces tab shows *all* surfaces, the drafts tab shows *all 4* variants. The mental model "configure once, render everywhere" works — but the operator is making 4 decisions in parallel with no clear sequence.

**Recommended:** for `audience: 'both'` policies, show two sub-tabs inside Drafts and Surfaces:

```text
Drafts tab (audience='both'):
  [ Internal tone (2) ]  [ Client tone (2) ]
  
Surfaces tab (audience='both'):
  [ Internal surfaces (3) ]  [ Client surfaces (4) ]
```

Same data, sub-tab grouping. Cuts cognitive load from 8 simultaneous decisions → 2×4. Ship in 28.11.6.

---

# Library content gaps (12 still missing — verified zero progress)

Same 12 keys as prior audit. Schema work has not started. Still scheduled for the polish wave:

`allergy_patch_test_policy`, `pregnancy_disclosure_policy`, `tipping_policy`, `walk_in_policy`, `weather_force_majeure_policy`, `phone_device_policy`, `confidentiality_nda_policy`, `booth_rental_boundary_policy`, `service_satisfaction_window_policy`, `parking_arrival_policy`, `tip_pooling_policy`, `minor_consent_policy`.

---

# Doctrine scorecard (delta vs 28.11.3.5)

| Doctrine | Status | Δ |
|---|---|---|
| Persona scaling | ✅ | ↑ all 4 layers now coherent for internal/external |
| Single source of truth | ✅ | ↑ surface audience tagged centrally |
| Visibility Contracts | ✅ | ↑ banner placeholder removed |
| Autonomy boundaries | ⚠️ | unchanged — auto-adopt still present (#1) |
| Audit immutability | ⚠️ | unchanged — conflict-resolve inaccurate (#4); ack snapshots missing (#5) |
| Lifecycle integrity | ⚠️ | new framing — no archive (#2), no adopt CTA (#1), no snapshot (#5) cluster as one missing layer |

---

# Recommended fix sequence

| Wave | Priority | Scope |
|---|---|---|
| **28.11.5 — Lifecycle hardening** | P0+P1 | #1 adopt CTA + #2 archive UI + #3 ack guard + #4 audit accuracy + #6 fallback signal + #7 historical ack visibility + #8 intake variant default fix |
| **28.11.6 — Variant snapshots & 'both' UX** | P1 | #5 snapshot table + ack reference rewrite + Section A 'both' sub-tab grouping |
| **28.11.7 — Polish & content** | P2 | #9–#18 + 12 missing library entries (library jumps 54 → 66) |

**28.11.5 bundles the P0 (adopt CTA) with adjacent P1 lifecycle fixes** because they share the same code paths (`PolicyConfiguratorPanel` mount logic, `usePolicyConfigurator` hooks). Splitting them costs more than bundling.

---

# Prompt feedback

**What worked:** Five audits in, the cadence is paying off — this audit is the shortest yet (~40% smaller than 28.11.2.5) because most carry-forwards collapse to one-liners and new findings cluster around the wave's actual diff. The "suggest how you might organize the configurator better" framing also continues to anchor each audit in a structural design problem rather than a flat bug list.

**To tighten next time:** Two upgrades to consider now that the P0 cluster is shrinking:

1. **"Audit + score readiness for next wave"** — add a one-line "Wave 28.11.5 readiness: 8/10" so we can see progress against a finish line, not just deltas.
2. **"Audit only the new wave's diff + carry-forward summary table"** — would cut this report by another 30% and let me end with the next-wave charter inline. Best now that the structural waves (split + boundary) are done and remaining work is incremental hardening.

Switch to framing #2 once 28.11.5 ships — by then the audit can shrink to "what did 28.11.5 break / leave open" with a one-row carry-forward table.

