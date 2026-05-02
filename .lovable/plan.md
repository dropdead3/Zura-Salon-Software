# Promotional Popup + Editor — Next-Round Improvements

You picked all four directions plus copywriting intelligence. That's correct in priority but **wrong as a single PR** — the foreground `PromotionalPopup.tsx` is 1078 lines and the editor is 1814 lines, and dropping A/B variants on top of both surfaces simultaneously is exactly how the May 2026 hero-notes regression happened. So the plan sequences them into 4 waves, smallest blast-radius first, each shippable independently.

## Blast-radius / wave map

```text
Wave   Scope                                   Lines touched   New surfaces  Risk
─────────────────────────────────────────────────────────────────────────────────
1      Refactor: split popup + editor          ~1500 moved     0             Low (pure code)
2      Editor IA cleanup + copy intelligence   ~250 net        1 sub-tab nav Med
3      Smarter performance panel               ~150 net        1 RPC         Med (read-only)
4      A/B variant testing                     ~400 net        1 schema col  High (data model)
```

Each wave is a separate PR. Approve this plan to ship Wave 1; we'll re-plan Wave 2 against the refactored shape so the IA work targets clean components instead of a 1814-line file.

---

## Wave 1 — Refactor (foundation, no operator-visible behavior change)

**Goal:** make the next three waves cheap and safe by killing the two megafiles.

### Public popup (`src/components/public/PromotionalPopup.tsx`, 1078 lines)

Extract into `src/components/public/promo/`:

- `PromotionalPopup.tsx` (~150 lines) — orchestrator: data fetch, lifecycle hook, trigger logic, branches to one of three variants
- `PromoModal.tsx` — modal variant + HeaderBand + side-rail layout
- `PromoBanner.tsx` — top banner variant
- `PromoCornerCard.tsx` — corner card variant
- `PromoFab.tsx` — re-entry FAB (already conceptually distinct)
- `PromoBody.tsx` — already exists internally; promote to its own file (the shared headline/body/CTA renderer)
- `PromoCountdownBar.tsx` — already exists internally; promote
- `usePromoLifecycle.ts` — extract the 200 lines of trigger/dismissal/auto-minimize/preview-reset state into one hook the orchestrator wires to its variants

This mirrors the **HeroForeground / HeroSlideRotator** parity pattern your canon already enforces and the `mem://architecture/preview-live-parity-pattern` doctrine. Each variant becomes a pure render component (props in, JSX out), which is what makes the future A/B work in Wave 4 trivial — the variant's rendering surface is one prop swap, not a 1078-line scroll.

### Editor (`src/components/dashboard/website-editor/PromotionalPopupEditor.tsx`, 1814 lines)

Extract sub-editors under `src/components/dashboard/website-editor/promo/`:

- `PromotionalPopupEditor.tsx` (~300 lines) — orchestrator: data fetch, dirty/save plumbing, sub-tab routing
- `PromoContentEditor.tsx` — eyebrow / headline / body / disclaimer + CharCounter + image
- `PromoOfferEditor.tsx` — offer code, CTA labels, destination chooser, custom URL config
- `PromoBehaviorEditor.tsx` — appearance, trigger, frequency, auto-minimize, FAB position
- `PromoTargetingEditor.tsx` — `showOn`, audience, schedule
- `PromoPerformancePanel.tsx` — redemptions card (already structurally distinct)
- `PromoPreviewSwatch.tsx` — both FAB + appearance swatches consolidated

Helpers (`Section`, `Field`, `CharCounter`, `appearanceLabel`, `toLocalInput`, `fromLocalInput`, `normalizeHex`, `AccentContrastWarning`) move to `src/components/dashboard/website-editor/promo/internals/`.

### Guardrails

- Add a smoke test per public variant (`PromoModal.test.tsx`, `PromoBanner.test.tsx`, `PromoCornerCard.test.tsx`) rendering each in isolation with mock props — the same isolation-test pattern HeroForeground got
- Extend `dead-export-home.test.ts` (or sister) to scan `src/components/public/promo/**` and `src/components/dashboard/website-editor/promo/**` so legacy variants can't drift
- All existing tests (`PromotionalPopup.fab-anchor.test.tsx`, `.close-lifecycle.test.tsx`, `.reset-replay.test.tsx`, `lint-rule-promo-popup-events.test.ts`) must pass without modification — that's the parity proof

**No operator-visible behavior change in this wave.** Same DB shape, same site_settings key, same events.

---

## Wave 2 — Editor IA cleanup + copy intelligence (your specific pain point)

After Wave 1, the editor is already split into 5 sub-editors. Wave 2 wires them up properly and adds the copy intelligence layer.

### IA: sub-tab navigation

Replace the single 5-section vertical scroll with a **left-rail sub-tab nav** matching the HeroEditor shape:

```text
┌──────────────────┬──────────────────────────────────┐
│ Content       •  │  [Active editor pane]            │
│ Offer & CTA      │                                  │
│ Behavior         │  Live preview swatch always      │
│ Where it shows   │  visible top-right               │
│ Schedule         │                                  │
│ ─────────────    │                                  │
│ Performance      │                                  │
└──────────────────┴──────────────────────────────────┘
```

Wired through the canonical `useEditorSubViewState<'content'|'offer'|'behavior'|'targeting'|'schedule'|'performance'>('content')` hook (per `mem://` Website Editor entry contract — defaults to Content on every entry, never persists to localStorage).

Each sub-tab shows a **dirty dot** (•) when its sub-section has unsaved changes, drawing the operator's eye to where they edited. The Save button stays in the orchestrator header so a single save persists the whole config (no per-section saves — the data model is one row).

### Copy intelligence (the eyebrow-urgency pattern, generalized)

The current editor has `EyebrowUrgencySuggestion` (when `endsAt` is within 72h, suggest urgency-tied eyebrow copy). Generalize this pattern into three sibling suggestion chips:

1. **Eyebrow suggestions** — already exists; extend with: time-of-year ("Spring refresh"), low-redemption nudge ("First 10 only" when `redemptionCount < 5` after 7 days), seasonal hooks. Pure deterministic — no AI call.

2. **Body copy templates** — keyed off `acceptDestination`:
   - `booking` → "Book your [service] this [period] and save [amount]."
   - `consultation` → "Tell us what you're after — we'll design the look together. Free 20-min consult."
   - `custom-url` → "[Action verb] to [outcome]. [Instructions hint]."
   
   Operator clicks → fills the field; manual edits preserved (same KNOWN_DEFAULT_LABELS pattern as the Accept CTA auto-rewrite).

3. **Value-anchor suggestions** — derive from offer code if numeric ("$45 OFF" → suggest `valueAnchor: '$45 value'`). Or from headline pattern matching (`/free .+/i` → suggest `'Free with purchase'`).

All three are **deterministic**, surfaced as a "Suggestions" subhead under the editor, dismissible via the existing `useDismissedSuggestion` infrastructure, and never auto-edit (operator owns final copy — per doctrine, AI cannot determine business eligibility).

If you later want LLM-generated suggestions, that's a Wave 2.5 add-on through Lovable AI (deterministic chips ship first; LLM augments). Marked as deferred until operator demand surfaces.

---

## Wave 3 — Smarter performance panel (read-only analytics)

Today: count + 14d sparkline + revenue-attributed.

Add (all backed by an `record_promo_response` RPC the public popup already writes to):

- **Conversion rate**: `accepted ÷ (accepted + declined + soft)` over the last 30d, with a delta chip vs prior 30d
- **Response split donut**: accepted / declined / soft-closed — tells operators whether the offer is being rejected (bad copy) or ignored (bad timing)
- **Per-surface drop-off**: when `showOn` includes multiple surfaces, show acceptance rate per surface so operators learn that booking-page popups convert 4× home-page popups
- **"This campaign vs last 30d" delta**: one chip near the headline of the panel: `↑ 32% vs last 30d` — the executive-brief tone

### New RPC: `get_promo_performance_breakdown(p_organization_id, p_offer_code, p_window_days)`

Returns:
```json
{ "accepted": 42, "declined": 18, "soft": 110, "by_surface": {"home": {...}, "booking": {...}}, "previous_window": {...} }
```

Pure read on `promo_responses` (already exists, RLS-scoped). No new write paths. New hook `usePromotionalPopupPerformance(offerCode)` mirrors the existing redemptions hook.

Materiality gate (per Visibility Contracts canon): if `accepted + declined + soft < 20`, the donut + delta render `<ConfigurationStubCard />` with copy "Need 20+ visitor responses before this is meaningful." Silence is valid — never show a 50/50 donut from 4 events.

---

## Wave 4 — A/B variant testing (highest blast radius — own PR)

After waves 1-3, this becomes a localized change because the popup is already split into pure variants and the analytics panel can already segment.

### Data model

Extend `PromotionalPopupSettings` with optional variant B:

```ts
interface PromotionalPopupSettings {
  // ... existing fields, treated as Variant A
  variantB?: {
    enabled: boolean;
    headline: string;
    body: string;
    eyebrow?: string;
    ctaAcceptLabel: string;
    accentColor?: string;
    accentPresetKey?: string | null;
    valueAnchor?: string;
  } | null;
  abTestStartedAt?: string | null;  // when split was activated; resets stats
}
```

No DB schema migration needed — site_settings stores JSON. The existing `writeSiteSettingDraft` read-then-update pattern handles this transparently.

### Split logic

Deterministic per-visitor: hash `getOrCreateSessionId() + offerCode → 0..1`, ≥0.5 = B. Visitor sees the same variant the entire session. Stamped on every `record_promo_response` call as `variant: 'A' | 'B'`.

### Analytics

Wave 3's `get_promo_performance_breakdown` extends to optionally group by `variant`. Editor's Performance panel renders a head-to-head card:

```text
┌─────────────────────┬─────────────────────┐
│ Variant A           │ Variant B           │
│ "Free Haircut..."   │ "Save $45 today..." │
│                     │                     │
│ Conv: 12.4%         │ Conv: 18.1%  ↑      │
│ Sample: 412         │ Sample: 398         │
│                     │                     │
│ Stat sig: 94%       │ ✓ Recommended       │
└─────────────────────┴─────────────────────┘
        [Promote B and end test]
```

Statistical significance via two-proportion z-test in pure JS (~30 lines). Below 90% confidence, no recommendation chip — silence is valid.

### Editor UI

Sub-tab "A/B Test" (visible only when `variantB.enabled === true`) lets operators author the B copy alongside A; toggle to enable/disable; "Promote B and end test" button writes B's content into A's fields and clears B.

### Guardrails

- Test starts fresh: `abTestStartedAt` stamped → any prior responses are excluded from the comparison (only post-stamp data counts)
- Default off — must opt in; no surprise splits
- A-only orgs see zero new UI; the entire A/B layer is gated on `variantB != null`

---

## What you get to approve right now

This plan describes the full arc, but **only Wave 1 ships when you approve.** It's the pure code-health refactor with zero operator-visible change, and it makes the next three waves dramatically safer to scope.

After Wave 1 lands, I'll re-plan Wave 2 against the new file shape (the IA proposal will be much more concrete once we're targeting `PromoContentEditor.tsx` instead of "lines 827–1037 of the megafile"). You can also re-prioritize at any seam — e.g. skip A/B if Wave 3's data shows the current popup is already converting well.

## Out of scope for all four waves

- Mobile-first audit (you didn't pick it; if it's a real issue, flag specific surfaces and we'll fold it into Wave 1's per-variant smoke tests)
- Multi-popup support (one offer per org stays the contract)
- Push to Lovable AI for copy generation — Wave 2 stays deterministic; LLM augmentation is deferred until operator demand
