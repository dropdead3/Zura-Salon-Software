

# Enhance Zura Apps Marketplace — Sell the Value

## Current State

The page is functional but minimal: flat cards with a one-line tagline, no feature highlights, no value propositions. The "Explore" cards are muted/dimmed with no engagement driver.

## Design Direction

Transform the page into a premium app marketplace that sells each app's value through feature bullets, benefit-driven copy, and stronger visual hierarchy. Follow the Zura brand voice — architectural, confident, no hype.

## Changes

### `src/pages/dashboard/AppsMarketplace.tsx` — Full Redesign

**1. Richer App Data Model**

Each app definition gets:
- `tagline` → short benefit statement (not a feature list)
- `features: string[]` — 3-4 key capabilities as bullet points
- `valueStatement` — one-sentence "why you need this" line
- `gradient` — subtle accent gradient for the icon container per app

**2. Subscribed App Cards (Color Bar, Connect)**

Larger cards with:
- Icon with colored gradient background (not plain `bg-muted`)
- App name + status badge (Active/Inactive) on first row
- Value statement in `font-sans text-sm text-muted-foreground`
- Feature checklist: 3-4 items using `CheckCircle2` icons in a compact grid
- "Open" button always visible (not hidden behind hover), styled as `tokens.button.cardAction`
- Inactive apps show a "Contact Sales" CTA instead of "Open"

**3. Explore App Cards (Marketer, Reputation, Reception)**

Full opacity (not dimmed at 0.7) — these need to excite:
- Same icon gradient treatment
- Value statement paragraph
- Feature bullets with muted check icons
- "Notify Me" or "Coming Soon" badge with `Lock` icon
- Subtle border glow or accent border-left matching the icon color

**4. Section Headers**

- "Your Apps" → keep as `tokens.heading.section`
- "Explore Apps" → add a subtitle: "Expand your capabilities with purpose-built tools."

**5. App Copy**

| App | Value Statement | Features |
|-----|----------------|----------|
| Color Bar | "Eliminate waste. Protect margin. Track every gram." | Backbar inventory tracking, Chemical dispensing logs, Waste analytics and cost visibility, Smart reorder alerts |
| Zura Connect | "Unify team and client communication in one hub." | Organized team channels, Direct and group messaging, AI-powered smart actions, Client SMS (coming soon) |
| Zura Marketer | "Turn services into campaigns. Close the attribution loop." | Campaign management across Meta and TikTok, AI-generated creative and copy, ROI attribution per campaign, Capacity-aware targeting |
| Zura Reputation | "Convert happy clients into five-star proof." | Smart review request timing, Google review automation, Reputation scoring dashboard, AI review responses (brand-aligned) |
| Zura Reception | "Never miss a call. Never lose a booking." | AI call handling and routing, Automated booking from calls, Front-desk workflow automation, After-hours coverage |

**6. Layout**

- Subscribed apps: 2-column grid, taller cards (~180px min-height)
- Explore apps: 3-column grid on large screens, stack on mobile
- Overall spacing: `space-y-10` between sections

### Files

| File | Change |
|------|--------|
| `src/pages/dashboard/AppsMarketplace.tsx` | Rewrite app definitions with richer data; redesign both card components with feature lists, value statements, gradient icons, and stronger CTAs |

Single file change — all data and components are co-located in the marketplace page.

