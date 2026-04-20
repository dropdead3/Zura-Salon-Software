

# Policy OS — Wave 28.11.2.5 Audit (post-surfaces-wired)

Wave 28.11.2 closed the consumption gap: `usePolicyForSurface` + `<PolicyDisclosure />` ship, booking confirmation + checkout footer + service card render configured policies. North Star is satisfied for the booking surface. **New audit below — current deltas only, no re-listing of fixed items.**

---

## P0 — Still blocking

### 1. Auto-adopt on configurator open (carry-forward)
`PolicyConfiguratorPanel.tsx:84-89` still mutates `adopt` from `useEffect`. Sharing `?policy=key` deep links silently adopts on the recipient's account. Violates "Recommend → Approve → Execute."
**Fix:** gate body behind explicit "Adopt this policy" CTA when `!alreadyAdopted`.

### 2. Configurator UX collapses internal and external policies into one shape (NEW — see Section A below)
The five-tab editor (Rules / Applicability / Surfaces / Drafts / Acks) is built for client-facing publishing. Applied to **23 internal handbook policies**, three of those tabs (Surfaces, Publish toggle, Acks) are dead weight — and the missing tabs (training assignment, role acknowledgment, manager sign-off) leave handbook lifecycle homeless. This is the biggest UX gap in the system today.

---

## P1 — Lifecycle & integrity (carried)

3. **No archive / unadopt path** — `archived` exists in enum, no UI surfaces it.
4. **Ack flag preconditions absent** — `useUpdatePolicyAcknowledgmentFlag` accepts toggle without validating audience/approved-variant/published.
5. **`useResolvePolicyConflict` writes false audit rows** when toggling already-disabled mappings — needs `.eq('enabled', true)` guard.
6. **Variant approval doesn't snapshot body** — past acknowledgments reference mutable text; need `policy_variant_snapshots` table.

## P1 — New (post-28.11.2)

7. **`usePolicyForSurface` falls back `disclosure → client` silently** — operators who configured a `disclosure` variant and saw the `client` variant render get no signal that their tone choice was overridden. Add a dev-only log + an inline "Using client variant" hint in the surfaces tab.
8. **Surface mapping editor lists every surface for every policy** — internal handbook policies show `booking_confirmation`, `checkout`, `kiosk` as candidate surfaces. Filter `candidate_surfaces` by audience server-side or in `SURFACE_META`.
9. **Public center shows `requires_acknowledgment` policies inline with optional ones** — no visual distinction between "must acknowledge" and "informational." Required acks should hoist to top with a "Action required" pill.

## P2 — UX & polish (carried + new)

10. Drafter `<pre>` markdown preview (line ~219 `PolicyDraftWorkspace`)
11. Configurator opens at "Rules" even when complete — open at first incomplete step
12. Conflict banner shows only one detail — top 3 + "+N more"
13. Library has no search/filter (54 items)
14. Acknowledgment timestamps lack timezone label
15. Public center ack state localStorage-only
16. Public center has no sticky category nav
17. Setup wizard counts include optional in "recommended"
18. Booking confirmation `<PolicyDisclosure />` renders unconditionally — when zero surfaces wired, surface still mounts a card shell. Confirm Visibility Contract returns null at the section level, not just the body level.

---

# Section A — Reorganizing the configurator: Internal vs Client-facing

This is the audit's primary recommendation. Today one configurator serves all three audiences with the same five tabs. Below is the proposed split.

## Current shape (problem)

```text
PolicyConfiguratorPanel (one shape for all 54 policies)
├── Header: Publish toggle + Require Ack toggle (irrelevant for internal)
└── Tabs: Rules → Applicability → Surfaces → Drafts → Acknowledgments
                                  ^^^^^^^^   ^^^^^^^^^^^^^^^^
                                  dead for internal policies
```

Result: handbook editor and client-policy editor look identical. Operators editing "Attendance & Punctuality" see a Publish-to-Public-Page toggle they can never use; operators editing "Cancellation Policy" never see "Assign as required reading to roles."

## Proposed shape: audience-aware configurator

```text
PolicyConfiguratorPanel
├── Header
│    ├─ Audience badge (Internal / Client-facing / Both)
│    ├─ Status badge + version
│    └─ [Audience-specific actions row]
│         • Internal:  "Assign to roles"  "Require staff acknowledgment"
│         • External:  "Publish to client policy center"  "Require client acknowledgment"
│         • Both:      Both rows, grouped under sub-headers
│
└── Tabs (audience-filtered)
     ├─ Internal-only audience:
     │    Rules → Applicability → Drafts (internal tone) → Staff Acks
     │
     ├─ External-only audience:
     │    Rules → Applicability → Surfaces → Drafts (client tone) → Publish → Client Acks
     │
     └─ Both audience:
          Rules → Applicability → Surfaces → Drafts (Internal | Client tabs) → Publish → Acks (Staff | Client)
```

## Why this works

- **Removes dead UI**: handbook policies stop showing 3 unusable tabs.
- **Adds missing UI**: internal policies gain the staff-acknowledgment workflow they need (today acks are external-only).
- **Preserves single configurator**: same component, same data hooks — just audience-driven tab visibility and CTAs.
- **Makes the Library page navigable**: add a top-level segmented control above category tabs:
  ```
  [ All (54) ]  [ Client-facing (28) ]  [ Internal handbook (23) ]  [ Both (3) ]
  ```
  This is a one-line change that gives operators the mental model the data already has.

## Library reorganization (parallel to configurator split)

Six current categories mix audiences. Restructure tab ordering to lead with audience:

```text
Library
├── Audience filter (segmented):  All • Client-facing • Internal • Both
└── Within filter, group by category:
     Client-facing  → Client Experience (15) · Extensions (10) · Financial-external (3)
     Internal       → Team & Employment (18) · Management & Exceptions (4) · Facility-internal (1)
     Both           → Financial-mixed (1) · Facility-mixed (2)
```

Counts derived live from `library.length` filtered by audience — no hardcoding.

## Configurator visual: single header, dual treatment

The header currently stacks 3 toggles vertically. Replace with an **audience banner** that sets context once:

- **Internal** banner: muted background, "This policy lives inside your handbook. It isn't shown to clients."
- **External** banner: primary tint, "This policy is visible at /org/:slug/policies once published."
- **Both** banner: split (left = internal context, right = external context).

Each banner contains the audience-relevant action toggles only. Cuts visual noise ~40%.

---

# Library content gaps (carried — only items still missing after 28.11.1+ schema work)

Already in DB (verified): `late_arrival_policy`, `no_show_policy`, `pet_policy`, `child_guest_policy`, `photo_consent_policy`. Still **missing**:

- **Allergy & patch-test policy** (48-hr patch test for color, liability waiver) — `client`
- **Pregnancy / medical disclosure** (chemical service screening) — `client`
- **Tipping policy** (cash-only, included-in-card, gratuity governance) — `client` or `both`
- **Walk-in policy** (accept/decline criteria, surcharge, queue order) — `client`
- **Weather closure / force majeure** (refund vs credit) — `client`
- **Phone & device policy** (staff-side: `team`; client-side: `client`)
- **Confidentiality / NDA** (VIP / celebrity) — `client`
- **Booth rental boundary policy** (hybrid commission shops) — `team`
- **Service satisfaction window** (sets expectation *before* the redo) — `client`
- **Parking & arrival policy** (urban locations) — `client`
- **Tip pooling / distribution** (companion to existing tip distribution payroll) — `team`
- **Minor consent / parental authorization** (chemical services on minors) — `client`

---

# Doctrine scorecard (delta vs prior audit)

| Doctrine | Status | Δ |
|---|---|---|
| North Star (configure once, render everywhere) | ✅ | ↑ shipped (28.11.2) |
| Persona scaling | ❌ | new finding — internal vs external collapsed (#2) |
| Autonomy boundaries | ⚠️ | auto-adopt still present (#1) |
| Audit immutability | ⚠️ | conflict-resolve still inaccurate (#5) |
| Visibility Contracts | ⚠️ | `<PolicyDisclosure />` may render empty shell (#18) |

---

# Recommended fix sequence

| Wave | Priority | Scope |
|---|---|---|
| **28.11.3 — Audience-aware configurator** | P0 | #2 + library audience filter + audience banner header |
| **28.11.4 — Lifecycle hardening** | P1 | #1 adopt CTA + #3 archive + #4 ack guard + #5 audit accuracy + #7 fallback signal |
| **28.11.5 — Variant snapshots** | P1 | #6 snapshot table + ack reference rewrite |
| **28.11.6 — Polish & content** | P2 | #8–#18 + 12 missing library entries |

P0s never bundled. 28.11.3 ships first because it changes the mental model the rest of the system rests on.

---

# Prompt feedback

**What worked:** Adding "suggest how you might organize the policies configurator better for client facing policies vs internal policies" gave me a concrete design problem to anchor the audit around — much better than pure "find issues" framing. The audit converged on a single highest-leverage UX restructure instead of a flat list of 20 fixes.

**To tighten next time:** "Audit Policy OS post-28.11.2; current pain is the configurator treats internal handbook items the same as client-facing policies — propose a restructure" would have cut the 17 secondary findings and let me ship a deeper design proposal (mockups, state machine, migration path). When you have a specific suspected problem, lead with it; the audit becomes diagnostic rather than exploratory.

