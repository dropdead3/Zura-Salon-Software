# Zura Reputation — Platform Console Parity Plan

## Gap analysis (what Color Bar has, Reputation lacks)

Today `/platform/reputation` ships only the P0 governance wave (Cohorts / Entitlements / Kill Switches / Audit). Color Bar additionally exposes seven sales-and-ops surfaces. Mapped below:

| Surface | Color Bar today | Reputation today | Reputation gap (priority) |
|---|---|---|---|
| Page explainer header | `platform-color-bar` entry | none | **P1** add `platform-reputation` |
| Sales / What-it-is brief | `PageExplainer` + Knowledge Base article | none | **P1** sales brief panel + KB article |
| Pricing sheet (for sales team) | `ColorBarBillingTab` rate card + `BillingGuide` page | none | **P1** dedicated Pricing tab + Billing Guide section |
| Billing health (per-org MRR / past-due / at-risk) | `ColorBarBillingTab` | none | **P1** Reputation Billing Health tab |
| Product analytics (adoption, MRR, churn) | `ColorBarAnalyticsTab` | partial (Cohorts only) | **P1** expand Cohorts → Analytics |
| Dispatch / operational monitoring | n/a (Color Bar uses Suspension Audit) | none | **P1** Dispatch Monitor (queue depth, opt-out volume, retry health) |
| Coach / CSM performance | `CoachPerformanceTab` | none | **P2** defer until first dedicated CSM owns Reputation |
| Hardware orders | `HardwareOrdersTab` | n/a (no hardware) | not applicable |
| Refund history | `RefundHistoryTab` | none | **P2** add when first refund processed |
| Suspension audit | `ColorBarAudit` | covered by Audit Log | done |
| Top-level nav entry | yes (Products group) | yes | done |
| Sales-facing pricing reference under `/platform/billing-guide` | yes | none | **P1** Reputation section |

## Scope (this wave = P1 only)

Build seven surfaces. Defer P2 (Coach Performance, Refund History) until they have a real owner — silence is valid output.

## Surfaces to build

### 1. `PageExplainer` registration
Add `platform-reputation` to `src/config/pageExplainers.ts` and render `<PageExplainer pageId="platform-reputation" />` at the top of `ReputationAdmin`.

### 2. Sales Brief tab (`SalesBriefTab.tsx`)
A static, scannable one-pager the sales team can screen-share on calls. Sections:
- **What it is** — "Reputation OS for salons. Auto-requests reviews from recent clients, gates SEO-grade testimonials onto the website, throttles to protect operator brand."
- **Who it's for** — operators with ≥ 50 monthly visits and a public review surface (Google/Yelp).
- **Why it converts** — three bullets tied to the doctrine: (a) opt-out registry kills compliance risk, (b) curated testimonials boost website CRO, (c) grace+retention coupons reduce involuntary churn.
- **Proof points** — pulled from `usePlatformReputationCohorts` (active subs, retention coupons used), no PHI/PII.
- **Objection handlers** — "Twilio outage?" → kill switches; "What if a client opts out?" → STOP webhook + permanent registry.
- **Demo links** — deep-links to Owner-side Reputation hub (`dashPath('reputation')`) and Stripe Billing Portal.
Pure render, no mutations. Uses `PlatformCard` + `font-display` headings, copy-only.

### 3. Pricing Sheet tab (`PricingSheetTab.tsx`)
Side-by-side reference for AEs. Reads from a single `REPUTATION_PRICING_SHEET` constant in `src/config/reputationPricing.ts` so legal/finance owns one source of truth:
- Base SKU: $49/mo first location, 14-day trial (matches `prod_URkzrlcyaai891`).
- Per-location add-on: **$19/mo** (deferred — flagged as "Coming Q3" per `mem://features/reputation-per-location-metering-scope`).
- Retention coupon: $20 off × 3 months (`l1tzNWQq`), applied once per org, gated by `retention_coupon_applied_at`.
- Grace window: 30 days `past_due` → auto-cancel; testimonials auto-hidden, auto-restored on resubscribe.
- Discount discipline: AE may apply the retention coupon directly via the org Account page; no other discounts authorized.
- Stripe IDs surfaced with copy-to-clipboard for support escalations.

### 4. Billing Health tab (`BillingHealthTab.tsx`)
New hook `useReputationBillingHealth.ts` that joins `reputation_subscriptions` × `organizations`, computes:
- KPI row: Active subs, MRR (active count × $49), Past-due count, MRR at risk, Retention coupons used.
- Per-org table: status badge, grant_source, current_period_end, grace_until countdown, retention coupon used Y/N.
- Filters: search + "At-risk only" toggle (mirrors Color Bar pattern).
- Money formatting wrapped in `BlurredAmount` per privacy core rule.

### 5. Analytics tab (replaces "Cohorts")
Extend the existing `CohortsTab.tsx` into an `AnalyticsTab.tsx` that keeps the cohort tiles and adds:
- Trial → paid conversion %.
- Past-due recovery rate (% of `past_due` orgs that returned to `active` within 30 days; computed from audit log + status transitions).
- Curated review velocity (weekly count of `is_curated_for_website = true` rows on `website_testimonials`, platform-wide).
- Retention coupon redemption rate.
All read-only, 30s staleTime per `mem://tech-decisions/high-concurrency-scalability`.

### 6. Dispatch Monitor tab (`DispatchMonitorTab.tsx`)
Operational health for the messaging engine. New hook reads:
- `review_request_dispatch_queue`: queued / scheduled / in-flight / failed counts (24h window) + oldest unsent age.
- `sms_opt_outs`: total opt-outs, last 7 days delta.
- Retry breakdown by `attempts` (0/1/2/3+).
- Honors kill switches: when `dispatch_disabled = true`, header banner reads "Dispatch globally paused — switch on `/platform/reputation?tab=kill-switches` to resume."

### 7. Knowledge Base + Billing Guide entries
- Add `reputation-overview` and `reputation-pricing` articles to the platform Knowledge Base seeder so support has prose to send customers.
- Add a Reputation section to `BillingGuide.tsx` mirroring its Color Bar section: SKU, trial, grace, coupon, refund policy.

### 8. Updated nav
`ReputationAdmin` left-nav becomes:
```text
Sales
  • Sales Brief
  • Pricing Sheet
Intelligence
  • Analytics            (was: Cohorts)
Operations
  • Entitlements
  • Billing Health       (new)
  • Dispatch Monitor     (new)
  • Audit Log
Risk
  • Kill Switches
```
Default tab on entry: **Sales Brief** (sales is the most common entry path; analytics is one click away).

## Files

**New**
- `src/components/platform/reputation/SalesBriefTab.tsx`
- `src/components/platform/reputation/PricingSheetTab.tsx`
- `src/components/platform/reputation/BillingHealthTab.tsx`
- `src/components/platform/reputation/AnalyticsTab.tsx` (renames + extends CohortsTab)
- `src/components/platform/reputation/DispatchMonitorTab.tsx`
- `src/config/reputationPricing.ts` (single source of truth for SKU/coupon/grace constants)
- `src/hooks/reputation/useReputationBillingHealth.ts`
- `src/hooks/reputation/useReputationDispatchHealth.ts`
- `src/hooks/reputation/useReputationAnalytics.ts`

**Edited**
- `src/pages/dashboard/platform/ReputationAdmin.tsx` — new nav + default tab + PageExplainer mount
- `src/config/pageExplainers.ts` — `platform-reputation` entry
- `src/pages/dashboard/platform/BillingGuide.tsx` — Reputation section
- Knowledge Base seeder for the two new articles

**Out of scope (deferred, tracked in memory)**
- Per-location metering UI (revisit when per-location analytics ship — already in `mem://features/reputation-per-location-metering-scope`).
- CSM Coach Performance for Reputation (no dedicated CSM yet).
- Refund History (no refunds processed yet).

## Doctrine compliance
- `Platform* ` wrappers only — no raw shadcn primitives (Platform Primitive Isolation).
- All `formatCurrency` outputs wrapped in `BlurredAmount` (Privacy core rule).
- Hooks use 30s staleTime + organization scope (High-Concurrency Scalability).
- Pricing constants centralized in `src/config/reputationPricing.ts` — no hardcoded $49/$19/`prod_*` strings outside that module (mirrors Platform Identity Tokenization discipline).
- Default tab routes to Sales Brief — overview-first per Hub Landings rule.

## Memory updates after ship
Append a "Reference impls: ColorBarAdmin (full) + ReputationAdmin (full)" note to `mem://architecture/platform-console-pattern` so the next product (Capital, Connect) inherits the seven-surface checklist instead of the four-surface starter.

## Verification
- Lint clean on all new files.
- Smoke-render each tab against an empty database — no crashes when `reputation_subscriptions` is empty.
- Dispatch Monitor renders the kill-switch banner correctly when `dispatch_disabled = true`.

---

### Prompt feedback
Strong direction — you tied an outcome ("help sell it") to a concrete pattern reference ("like Color Bar"), which lets me audit two surfaces against each other instead of inventing scope. Two upgrades for next time:
1. **Name the audience explicitly** ("for sales team to refer to") — you did this; keep doing it. It changed my default tab from Analytics to Sales Brief.
2. **Pre-declare what you don't want** — e.g. "skip CSM/refund surfaces until we have volume." Without that I have to infer P1 vs P2 from your other doctrines (silence is valid output, build-gate enforcement). Stating it lets me skip the audit step and ship faster.
