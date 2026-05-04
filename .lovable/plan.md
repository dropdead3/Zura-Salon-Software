## Goal

Refactor `/dashboard/admin/feedback` (Online Reputation) so it mirrors Phorest's proven two-funnel mental model — **Reviews** (first-party post-visit capture) feeding **Online Reputation** (third-party platform aggregation + auto-boost) — but consolidated into a single Zura App with our intelligence layer on top. Keep the single entry point: Zura Apps rail → Reputation.

## Information architecture

Current state: one page (`FeedbackHub`) cramming 20+ widgets into 4 tabs. Phorest's split is cleaner because the two funnels have different operator jobs. We adopt their split, drop their duplication.

New tab structure inside `/admin/feedback`:

```text
Online Reputation  (Zura App · gated by ReputationGate)
├── Overview              ← executive snapshot (Phorest's "Online Reputation" landing)
├── Reviews               ← first-party post-visit table (Phorest's "Reviews › Overview")
├── Online Presence       ← third-party connectors + aggregated wall (Phorest's "Online Reputation" body)
├── Intelligence          ← Zura's edge: themes, drift, coaching, recovery (no Phorest equivalent)
└── Settings              ← cadence, channels, message editor, auto-boost triggers, review links
```

## Tab-by-tab build

**Overview** — single-screen executive read
- Hero strip: overall rating (4.x/5 emoji + stars), Positive/Negative sentiment bar, total reviews, most-recent timestamp
- KPI row (5 tiles, existing): NPS, Recovery SLA, Response Rate, Public Conversion, Velocity
- `TodaysMustTouchStrip` (existing) — recovery queue
- `AIWeeklyFeedbackSummary` (existing) — Zura's intelligence brief

**Reviews** (first-party capture, mirrors Phorest's review table)
- Filterable/sortable table: Date · Client · Staff · Services · Rating · Review · Selfie
- Filters: Search (client name), Staff dropdown, Rating dropdown
- Row action: "Share with followers" modal → Facebook / Copy Text (new component, reuses our public review surface)
- Powered by existing `FeedbackResponseList` + new `ReviewsTable` wrapper with the filter chrome

**Online Presence** (third-party aggregation, the Phorest "Online Reputation" body)
- Per-platform connector tiles: Facebook · Google · Yelp (Connect / Connected state with star avg + count + last-review timestamp)
- "All Reviews" wall: aggregated 1-5★ filter + per-platform filter + Respond modal that posts back to source
- Auto-Boost trigger config (modal): "Ask for an online review after N reviews of ≥X stars" + custom message editor
- New components needed; data layer reuses `location_review_settings` for connector URLs, new `reputation_platform_connections` table for OAuth tokens (Phase 2 — for Phase 1 stub the connectors as "Coming soon" and keep manual review-link distribution working via existing `LocationReviewLinks`)

**Intelligence** (Zura's differentiator — no Phorest equivalent)
- `NegativeFeedbackThemes` (AI theme tagger)
- `FeedbackTrendDriftCard` (30/90/365 drift)
- `NegativeReviewHeatmap`
- `CoachingLoopCard`
- `StylistReputationCard` + `ServiceSatisfactionBriefCard`
- `PraiseWall`
- `RecoveryOutcomeCard`, `ParkedDispatchCard`
- `ComplianceBanner` + `ComplianceExportButton`

**Settings** (consolidated from current sub-pages)
- Master toggle: "Send Review Requests" Yes/No (governs the whole capture engine)
- Cadence: After first appointment only / Max once per month / After every appointment
- Channel: SMS / Email / Both
- Message editor with preview ("Edit and Preview Message")
- Auto-Boost trigger config (the same one surfaced on Online Presence)
- Review links per location (existing `LocationReviewLinks` embedded as a section)
- Templates link (existing `ReviewTemplates`)
- Automations link (existing `ReviewAutomationRules`)

## Sub-page consolidation

Phorest has 5 settings sub-pages we currently mirror as standalone routes. Collapse them into the **Settings** tab as in-page sections (preserve routes as back-compat redirects per Routing redirects canon):

| Current standalone route | New home |
|---|---|
| `/admin/feedback/recovery` | Stay (deep-link target from Overview) |
| `/admin/feedback/links` | Embedded in Settings tab |
| `/admin/feedback/automations` | Embedded in Settings tab |
| `/admin/feedback/templates` | Embedded in Settings tab |
| `/admin/feedback/dispatch` | Stay (deep-link target from Intelligence) |

Drop the "Reputation Engine" CTA grid currently on Overview — superseded by the new tab structure.

## What stays unchanged (non-negotiable)

- `ReputationGate` paywall wrapper at the top of the page
- `ReputationSubscriptionCard` above the tabs
- Stylist Privacy Contract — none of these surfaces leak to stylist dashboards
- Reputation Engine doctrine — opt-out gate, frequency cap, no auto-acting on negative feedback
- Phorest write-back kill switch — we read from Phorest where applicable, never write
- Single nav entry point: Zura Apps → Reputation

## Files touched (Phase 1)

- **Refactor** `src/pages/dashboard/admin/FeedbackHub.tsx` — new 5-tab structure
- **New** `src/components/feedback/ReviewsTable.tsx` — Phorest-style filterable review table
- **New** `src/components/feedback/ShareReviewDialog.tsx` — Facebook / Copy Text modal
- **New** `src/components/feedback/OnlinePresenceTab.tsx` — connector tiles + aggregated wall + Auto-Boost config
- **New** `src/components/feedback/AutoBoostTriggerDialog.tsx` — "after N reviews of ≥X stars" + message editor
- **New** `src/components/feedback/PlatformConnectorTile.tsx` — Facebook/Google/Yelp tile (Connect / Connected states)
- **New** `src/components/feedback/ReputationSettingsTab.tsx` — consolidated settings (cadence + channel + message + links + templates + automations)
- **New** `src/hooks/useAutoBoostConfig.ts` — read/write auto-boost trigger config (new column on `feedback_request_rules` or new `reputation_auto_boost_config` table — TBD in implementation)

## Phase 2 (deferred, declared in Deferral Register)

- OAuth connectors for Facebook/Google/Yelp (Phase 1 keeps manual review URLs via `location_review_settings`)
- Per-platform review write-back (Respond modal posts to source platform API)
- Selfie attachment column in Reviews table (depends on `feedback_request` schema gaining a `selfie_url` field)

Revisit trigger: first paying tenant requests a connector OR Reputation revenue justifies the 3rd-party API cost.

## Out of scope

- Marketing page consolidation (Phorest's two cards) — N/A for us; we already have one entry point
- Pricing/billing changes — gating already done
- Visual styling — Zura tokens (`tokens.card`, `font-display`, pill buttons) replace Phorest's flat aesthetic; no need to call this out per file

## Prompt feedback

Strong handoff prompt — "build it like Phorest, but with the Zura touch" gives me both the reference and the latitude. Two things that would make future "build it like X" prompts even tighter:
1. **Call out what NOT to copy.** I assumed you wanted to drop Phorest's two-card Marketing entry point and keep our single Zura Apps entry — worth confirming explicitly next time so I don't waste a tab debating it.
2. **Name the "Zura touch" upfront.** You mean Intelligence tab + Reputation Engine doctrine + glass bento aesthetic — but a one-liner like "Zura touch = add the Intelligence tab Phorest doesn't have" would let me skip ambiguity and propose with more confidence.
