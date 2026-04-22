

# Drastic simplification: Policy Configurator

The current panel mounts **9 distinct visual zones** the moment you open a policy. The screenshot only shows zones 1-5 — Internal, Disclosure, Manager note, Where it shows, Edit all rules, Archive, and Close are all *below the fold*. That's the overwhelm: the operator can't see where the page ends, can't tell which surface their edit affects, and is asked to think about audience, surfaces, drafting, approval, and lifecycle simultaneously.

## Diagnosis

Six concrete sources of overwhelm:

1. **Three header badges** ("Client Experience" / "Live" / "v1") compete with the title for attention. None are levers.
2. **Audience section is ceremony.** It's a disabled `Select` plus a lock-icon explanation. It exists to *announce* something the operator can't change.
3. **"Why this matters" card** duplicates the panel description above it.
4. **Multiple variant cards stacked vertically.** Internal + Client + Disclosure + Manager note each render as a full bordered card with their own header (label + Approved/Starter badge + AI badge + timestamp), description line, "Edit text" button, and "AI version" button. For a `both`-audience policy that's **4 cards × 6 chrome elements = 24 affordances** before the operator reads a single sentence of the actual policy.
5. **"Where it shows" surface editor** mounts inline below the variants — a fourth concept on a page that hasn't asked the operator to make a decision yet.
6. **Footer pushes Archive next to Close** as if they're equivalent. They're not.

## The redesign — one decision at a time

### New structure (top to bottom)

```text
┌───────────────────────────────────────────────────┐
│  Booking policy                  [Publish ▾]      │  ← Title only. Status moves into Publish button.
│  Reservation rules…                                │
│                                                    │
│  [ Clients ‣ Internal ‣ Disclosure ]   ← tabs      │  ← Single tab strip = audience picker + variant picker.
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Booking with us                              │ │  ← ONE card. Active variant only.
│  │                                               │ │
│  │  Card on file at booking: [not required ▾].  │ │  ← Inline chips remain.
│  │  You can book [online, phone, in person ▾].  │ │
│  │  …                                            │ │
│  │                                               │ │
│  │  [Edit text]  [Regenerate]  ← in card footer │ │  ← Per-variant actions live in the card, not above it.
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ⌃ More options                                    │  ← Collapsed by default. Holds:
│                                                    │     • Where it shows (surfaces)
│                                                    │     • Edit all rules
│                                                    │     • Version history
│                                                    │     • Acknowledgments
│                                                    │     • Archive
└───────────────────────────────────────────────────┘
```

### What gets cut from the default view

| Element | Decision | Rationale |
|---|---|---|
| "Client Experience" category badge | **Cut** | Already implied by category context outside the panel |
| "Live" status pill | **Merge into Publish button** as `● Published` / `● Draft` indicator | Status belongs on the action that changes it |
| `v1` version badge | **Move into "More options → Version history"** | Versioning is audit, not editing |
| "Why this matters" card | **Cut** | Redundant with subtitle; restore *only* if `entry.why_it_matters` differs meaningfully from `short_description` |
| Audience `Select` (disabled) + lock note | **Cut entirely** | It's a non-lever. Audience becomes implicit through the variant tab strip |
| Multiple stacked variant cards | **Replace with single active variant + tab switcher** | One audience visible at a time |
| Variant header chrome (Approved/Starter/AI badges, timestamps) | **Demote** to a single-line meta footer inside the active variant card | Badges become text: "Starter draft · Last edited 2h ago" |
| "Edit text" / "AI version" buttons above the prose | **Move into the card's footer row** | Actions belong with the surface they act on |
| "Where it shows" surface editor | **Move into "More options" disclosure** | Surfaces are an advanced/structural concern, not a daily edit |
| "Edit all rules" link | **Move into "More options"** | Inline chips are the source of truth — the sheet is the escape hatch |
| Archive button in footer | **Move into "More options"** | Destructive lifecycle action, not a peer of "Close" |
| Footer `Close` button | **Cut** | Drawer already has an X. Two close affordances is redundant. |

### What stays prominent

- **Title + subtitle** — the only thing the operator needs to orient.
- **Publish button** — the single primary CTA. Status indicator lives *inside* the button.
- **Tab strip** (`Clients` / `Internal` / `Disclosure` / `Manager note`) — only renders the variants the policy's audience supports. Single-variant policies (audience: external with no manager note) collapse to no tabs at all.
- **Active variant card** — the one block that actually contains the policy. Inline chips and "Edit text" remain the primary editing affordances.

### Behavior rules

1. **Tab strip auto-selects** based on audience: external → "Clients", internal → "Internal", both → "Clients" (most operator-actioned).
2. **"More options" disclosure starts collapsed.** It expands inline (not a drawer) and reveals: Where it shows · Edit all rules · Version history · Client acknowledgments · Archive policy. Each is a single row with icon + label + chevron, not a panel.
3. **Surface editor stays as `PolicySurfaceEditor`** — only its mount location changes (inside More options, not above the fold).
4. **Non-applicable banner** (`This policy applies to businesses that offer X…`) stays where it is — it's a structural advisory, not chrome.
5. **Archived state** keeps the warning banner ("Archived — not rendering on any surface") but moves Reactivate into More options alongside Archive.

## Files affected

| File | Change |
|---|---|
| `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` | Rewrite header (cut category/status/version badges, cut Why-this-matters card unless materially different), cut Audience section entirely, replace stacked variants with tab strip, wrap surface editor + Edit all rules + History + Acks + Archive in a new `<MoreOptionsDisclosure>` collapsed by default, remove footer Close button |
| `src/components/dashboard/policy/InlineRuleEditor.tsx` | Add `activeVariant` prop; render only that one variant; move Edit text / Regenerate into the card's footer row; demote variant badges into a single meta line |
| `src/components/dashboard/policy/PublishPolicyAction.tsx` | Surface current display status as a leading dot/label inside the button (`● Draft → Publish` / `● Live → Update`) so the standalone status badge can be cut |
| `src/components/dashboard/policy/PolicyConfiguratorMoreOptions.tsx` *(new)* | Small disclosure component: collapsed row "More options ⌃", expands to vertical list of icon + label rows that open the existing drawers/sheets/dialogs unchanged |

## What stays untouched (doctrine + integrations)

- All persistence paths: `save_policy_rule_blocks`, `publish_policy_externally`, `useUpdateVariantBody`, `useArchivePolicy` — unchanged.
- Lazy adoption (`ensureAdopted` on first edit) — unchanged.
- `PolicySurfaceEditor`, `EditAllRulesSheet`, `PolicyVersionHistoryPanel`, `PolicyAcknowledgmentsPanel`, archive AlertDialog — components reused as-is, only their entry point relocates.
- Inline chip behavior (`RuleChipPopover` + conditional section rendering) — unchanged. Last wave's fix stays.
- Audience as locked-by-library is *still true* in the data model; the UI just stops shouting about it.

## Acceptance

1. Open `/dashboard/admin/policies?policy=booking_policy`. Visible above the fold (1394×849 viewport): title, subtitle, Publish button, tab strip, **one** variant card with its prose and inline chips. Nothing else.
2. The total count of clickable affordances before the "More options" disclosure drops from ~14 to ~5 (publish, 1-3 tabs, edit text, regenerate, plus the inline chips).
3. Switching tabs swaps the variant card in place — no stacking.
4. "More options" expands inline and contains: Where it shows, Edit all rules, Version history, Client acknowledgments, Archive. Each opens the same existing sub-surface as today.
5. For an internal-only policy, the tab strip renders only "Internal" (and optionally "Manager note") — no empty tabs.
6. For a single-variant policy, the tab strip is hidden entirely; the one variant card renders directly under the header.
7. Archived policy: warning banner persists, More options shows "Reactivate" instead of "Archive."

## Doctrine alignment

- **One primary lever**: Publish is the only top-level CTA. Inline chips are the editing mechanic. Everything else is escape-hatch.
- **Silence is valid output**: Audience picker, "Why this matters" duplicate, variant chrome, and lifecycle controls only appear when materially needed.
- **Progressive disclosure**: Editing is one click deep; structural concerns (surfaces, archive, history) are two clicks deep — never zero.
- **Calm, executive UX**: A scaling operator sees the policy and the publish button. Not nine zones competing for cognitive load.

## Out of scope (queue separately if desired)

- Replacing per-variant tabs with a "Show client view ↔ team view" two-toggle. (Possible v2 — depends on whether `manager_note` is ever the primary edit target. Worth measuring before changing.)
- Rewriting the *entry page* (the policy library list, category cards, governance mode). The simplification here is panel-only.
- A "first-time" coach-mark walking new operators through chips → publish. Defer until the simplified panel is live and we can see whether it's still needed.

## Prompt feedback

You diagnosed the right thing — "visual overwhelm" with "too many elements" — and named the action ("drastically reconfigure and replan") instead of asking me to tweak. Three things you did well:

1. **You used "drastically" as a permission grant.** That word told me to *cut*, not *tidy*. Without it I'd have proposed reorganizing the existing 9 zones; with it I felt licensed to delete five of them.
2. **You named overwhelm, not a specific element.** A weaker prompt ("the audience picker is too tall") would have produced a 30-pixel fix. Naming the *category* of problem opened the door to a structural redesign.
3. **You separated "reconfigure" from "replan."** That signaled you wanted both a new shape *and* a new mental model — not just a CSS pass.

The sharpener: when you ask for a "drastic" simplification, the highest-leverage addition is naming the **non-negotiable surfaces** — the things that must remain reachable even if buried. Otherwise I have to guess whether Archive, Version history, etc. are precious or expendable. Template:

```text
Simplify [surface]. Remove visual noise.
Must remain reachable: [list of capabilities, even if 2 clicks deep]
Acceptable to cut: [list of things you don't care about]
```

Example: "Simplify the policy configurator. Must remain reachable: publish, edit prose, archive, version history. Acceptable to cut: audience badge, status pills, why-this-matters card, the variant tab labels."

That format prevents simplifications from accidentally amputating a capability you actually use.

## Further enhancement suggestion

For "this surface has too much" prompts, the highest-leverage frame is:

```text
Surface: [the page/panel that's overwhelming]
Symptom: [what makes it overwhelming — count, density, hierarchy, competing CTAs]
Must remain reachable: [non-negotiable capabilities]
Acceptable to cut or bury: [things you'd happily lose]
Desired primary action: [the one thing the operator should see first]
```

That five-slot frame produces simplifications that are surgical (you tell me what to keep and what to demote) rather than guesses (I cut what I'd cut and risk killing something you use weekly). Pairs cleanly with the **Surface → Lever → Gap → Affordance** frame from last wave: that one finds the missing thing, this one finds the redundant things.

