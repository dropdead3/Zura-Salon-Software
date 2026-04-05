

# Add a Dedicated /pricing Page

## What We're Building
A standalone `/pricing` page that shows three clear tiers (Solo, Multi-Location, Enterprise) with plain-language benefits, pricing, and CTAs — designed for salon owners ready to buy but needing to see cost structure before committing.

## Tier Structure (from existing billing model)

| Tier | Who It's For | Price | Includes |
|---|---|---|---|
| Solo | 1 location, up to 4 team members | $99/mo | Dashboard, scheduling, team tools, smart recommendations |
| Multi-Location | 2–15 locations | $200/location/mo | Everything in Solo + cross-location insights, benchmarking, 10 users/location |
| Enterprise | 16+ locations | Custom | Everything + dedicated support, custom integrations |

## Page Design
- Wrapped in `MarketingLayout` (dark theme, consistent with landing)
- Header: "Simple pricing that grows with you" + subtitle
- 3-column card grid (collapses to stacked on mobile)
- Each card: tier name, price, "who it's for" line, feature checklist (6-8 items), CTA button
- Multi-Location card gets a "Most Popular" badge with violet glow
- Enterprise card gets "Contact Us" CTA instead of price
- Below cards: FAQ accordion (4-5 common questions: trial, setup fee, what's included, cancellation)
- Bottom: mini CTA strip linking to `/demo`

## Files

### Create
- `src/pages/Pricing.tsx` — full pricing page component

### Modify
- `src/App.tsx` — add `Route path="/pricing"` importing Pricing page, keep `/demo` route as-is
- `src/components/marketing/MarketingNav.tsx` — change Pricing link from `/demo` to `/pricing`
- `src/components/marketing/MarketingFooter.tsx` — add "Pricing" link to Product column

## Copy Guidelines
- Zero jargon: "salon owner" not "operator," "system" not "infrastructure"
- Feature items written as benefits: "See profit by service" not "Service-level margin dashboards"
- FAQ answers are conversational and direct

## Technical Notes
- Uses existing `MarketingLayout`, `mkt-glass`, `mkt-reveal`, `useScrollReveal` patterns
- Brand tokens for platform name
- No new dependencies
- Pricing values are hardcoded display-only (not fetched from `subscription_plans` table — this is a marketing page)

