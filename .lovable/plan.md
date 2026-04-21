

# Wave 13F.E — Step Health surface on Setup Funnel

Wire the `useOrgSetupFunnelHealth` hook into the existing `/platform/setup-funnel` page so the materiality-graded `alert / watch / ok` tiers actually drive someone's attention. Without this, 13F.D was a tree falling in an empty forest.

The hook already exists, returns the right shape, and applies thresholds. Nothing else in the app reads it.

---

## What the user sees

A new **Step Health** card lands directly above the existing "Step-by-step drop-off" card. It is a compact, signal-only table with one row per step. Its job is the opposite of the drop-off card below it: instead of raw counts and history, it surfaces *which step is currently broken right now* and *why*.

```
┌─ STEP HEALTH ──────────────────────────────── governance signal ─┐
│ Step  Name           Sample  Drop-off  Validation blocked  Status │
│  0    Fit check        42      18%        4%                 ok    │
│  3    Team             38      52% 🔴    9%                 alert  │
│  5    Catalog          31      31% 🟡   28% 🔴             alert  │
│  7    Intent            3       —          —                  —    │  ← dim, "below sample"
└──────────────────────────────────────────────────────────────────┘
```

Rules per row:
- **Below `MIN_SAMPLE` (5 viewers)**: render dimmed, status pill reads "Insufficient sample (n<5)", numeric cells show `—`. Honors silence-is-valid-output.
- **`alert`**: red dot on the offending metric cell, status pill `Alert` in red.
- **`watch`**: amber dot, status pill `Watch` in amber.
- **`ok`**: muted check, no pill.
- A row is `alert` if **either** drop-off or validation-blocked severity is `alert`.

A small banner at the top of the card shows: `2 steps need attention · 1 watch · 6 ok` so a platform admin can triage in one glance.

If the entire funnel is below MIN_SAMPLE (cold start), the card renders an empty state ("Funnel data warming up — need ≥5 viewers per step before grading"), not zeros pretending to be insights.

## What it does *not* do (intentionally)

- No new outreach actions. Step Health is **read-only diagnostics** — the existing per-step drill-down below it owns outreach.
- No alerts, emails, or notifications fired from the UI. (Continuous-monitoring belongs in `setup-funnel-digest`, which already runs weekly. Adding a second alert path violates alert-governance.)
- No filters (range / cohort) on this card — Step Health reflects the *all-time* materiality of each step. Cohort filtering would re-introduce the small-sample noise the materiality thresholds exist to suppress.
- No new DB tables, migrations, or RPCs.

---

## Files affected

- **`src/pages/dashboard/platform/SetupFunnel.tsx`** — import `useOrgSetupFunnelHealth`, render new `<StepHealthCard />` immediately above the existing "Step-by-step drop-off" `<Card>`. Reuse `STEP_LABELS` for naming.
- **`src/components/platform/onboarding/StepHealthCard.tsx`** *(new)* — presentation component. Receives `rows: FunnelHealthRow[]`, renders the card. Uses the same dashboard tokens as the rest of `SetupFunnel.tsx` (`Card`, `CardHeader`, `tokens.card.title`, `font-display` labels) — *not* the Platform bento `PlatformCard`, because the rest of the page uses dashboard tokens. Keeping one visual language on this page.
- **`mem://features/onboarding/wizard-orchestrator-contract.md`** — append "Visibility surface: Step Health card on `/platform/setup-funnel`" + Deferral Register entry: *Email/notification-driven step-health alerts deferred until `setup-funnel-digest` is extended; revisit when first `alert`-tier step persists for 2 consecutive weeks.*

## Acceptance

1. Visiting `/platform/setup-funnel` as a `platform_admin` shows the new Step Health card above the drop-off card.
2. With current low-volume telemetry, every row renders dimmed with the "below sample" pill, and the summary banner reads "Funnel data warming up." No false-positive alerts.
3. Manually inflating one step's view counts past 5 surfaces the correct severity tier (verified by reading the hook output, no DB needed for QA).
4. No console warnings, no extra network requests beyond the one `org_setup_funnel_health` view fetch.
5. The card respects the existing page's `tokens.layout.pageContainer` width and spacing — no visual seam against the cards above/below it.

## Doctrine compliance

- **Visibility contract**: card returns dim-state when sample threshold unmet, never zeros. ✓
- **Alert governance**: read-only surface; weekly `setup-funnel-digest` remains the single notification channel. ✓
- **UI canon**: dashboard tokens, `font-display` headers, Aeonik body, no `font-bold`. ✓
- **AI prohibition**: pure deterministic rules from the hook; no inferred severity. ✓

