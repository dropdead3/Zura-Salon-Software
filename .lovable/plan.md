

# Add Zura Hiring to Apps Marketplace

## What

Add **Zura Hiring** as a new "Explore" app card in the marketplace with compelling copy, feature bullets, and urgency-driven missed-opportunity line.

## App Definition

| Field | Value |
|-------|-------|
| key | `hiring` |
| name | Zura Hiring |
| tagline | Recruiting + Talent Pipeline |
| valueStatement | "Stop guessing on hires. Build a talent pipeline that predicts success." |
| features | Application pipelines and candidate CRM · Interview scoring and trial shift tracking · Auto follow-ups across the funnel · AI success prediction based on comparable hires |
| missedOpportunity | "The average salon spends 45 days filling a chair. A structured pipeline cuts that in half." |
| icon | `Users` (from lucide-react) |
| gradient | `from-indigo-500/30 to-blue-600/30` |
| accentColor | `border-indigo-500/30` |
| comingSoon | true |

## Changes

| File | Change |
|------|--------|
| `src/pages/dashboard/AppsMarketplace.tsx` | Import `Users` icon; add Zura Hiring entry to `EXPLORE_APPS` array |

Single array entry addition — no structural or layout changes needed. The existing `ExploreAppCard` component and 3-column grid handle the new card automatically.

