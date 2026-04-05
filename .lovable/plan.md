

# Hybrid Solutions Mega-Dropdown + Solution Pages

## Overview
Transform the "Solutions" nav link into a two-column mega-dropdown menu, and create dedicated landing pages for each solution area. Left column shows persona paths ("I'm a..."), right column shows solution areas. Each item links to its own page.

## Mega-Dropdown Design

```text
┌─────────────────────────────────────────────────────────────┐
│  WHO ARE YOU?              │  SOLUTIONS                     │
│                            │                                │
│  → Independent Stylist     │  → Business Visibility         │
│  → Salon Owner             │  → Smart Scheduling            │
│  → Multi-Location Owner    │  → Team Performance            │
│  → Enterprise Leader       │  → Inventory Control           │
│                            │  → Connected Platform          │
│                            │                                │
│  ─────────────────────────────────────────────────────────  │
│  "Not sure where to start?" → Get a Demo                   │
└─────────────────────────────────────────────────────────────┘
```

- Hover-triggered on desktop, tap-to-open on mobile
- Glass aesthetic matching existing marketing surface (bg-slate-950/95 backdrop-blur-xl)
- Each item has icon + label + one-line description
- Subtle violet accent on hover
- Mobile: collapses into accordion sections within the existing mobile menu

## New Pages (6 total)

### 4 Persona Pages
Each follows the same template: hero with persona-specific headline, 3-4 problem/solution pairs pulled from PersonaExplorer data, testimonial slot, and CTA.

| Route | Page | Hero Headline |
|-------|------|---------------|
| `/solutions/independent` | Independent Stylist | "Build your business with clarity — from chair one." |
| `/solutions/salon-owner` | Salon Owner | "Run your team with confidence, not guesswork." |
| `/solutions/multi-location` | Multi-Location Owner | "Every location. One standard. Zero guesswork." |
| `/solutions/enterprise` | Enterprise Leader | "Portfolio-level visibility. Decision-grade intelligence." |

### 2 Solution-Area Pages (new, beyond existing /product)
| Route | Page | Focus |
|-------|------|-------|
| `/solutions/scheduling` | Smart Scheduling | Calendar optimization, gap detection, rebooking |
| `/solutions/inventory` | Inventory Control | Product tracking, cost visibility, reorder intelligence |

The existing `/product` page serves as the "Business Visibility + Intelligence" solution page. The existing `/ecosystem` page covers the "Connected Platform" story. So we reuse those rather than duplicating.

## File Changes

### Create: `src/components/marketing/SolutionsMegaMenu.tsx`
- Two-column layout component rendered inside MarketingNav
- Left column: 4 persona cards with icons from PersonaExplorer
- Right column: 5 solution items (Visibility → /product, Scheduling → /solutions/scheduling, Team → /solutions/team, Inventory → /solutions/inventory, Connected → /ecosystem)
- Bottom bar: "Not sure? → Get a Demo" CTA
- Desktop: absolute-positioned dropdown below nav, triggered by hover/click on "Solutions"
- Mobile: integrated into existing mobile menu as expandable accordion
- Animated with framer-motion (fade + slide-down)

### Modify: `src/components/marketing/MarketingNav.tsx`
- Replace the static "Solutions" Link with a trigger that opens `SolutionsMegaMenu`
- Desktop: hover intent with 150ms delay (prevents accidental triggers)
- Mobile: "Solutions" becomes an expandable section showing all items inline
- Keep Ecosystem and Pricing as standard links

### Create: `src/components/marketing/SolutionPageTemplate.tsx`
- Shared template for all solution/persona pages
- Props: hero content, problem/solution pairs, optional testimonial, CTA variant
- Sections: Hero → Problem list → Solution cards → Social proof → CTA
- Reuses `MarketingLayout`, `useScrollReveal`, existing glass card styles

### Create: 6 page files
- `src/pages/solutions/IndependentStylist.tsx`
- `src/pages/solutions/SalonOwner.tsx`
- `src/pages/solutions/MultiLocation.tsx`
- `src/pages/solutions/Enterprise.tsx`
- `src/pages/solutions/Scheduling.tsx`
- `src/pages/solutions/Inventory.tsx`

Each imports `SolutionPageTemplate` and passes page-specific content. Problem/solution copy is pulled from the existing PersonaExplorer data arrays to stay consistent.

### Modify: `src/App.tsx`
- Add 6 new routes under `/solutions/*`

## Technical Details
- No new dependencies — uses existing framer-motion, lucide-react, and marketing CSS
- Dropdown uses `onMouseEnter`/`onMouseLeave` with timeout for hover intent (desktop)
- Click-outside closes dropdown (useRef + useEffect pattern)
- ESC key closes dropdown
- Mobile accordion uses AnimatePresence for expand/collapse
- All pages lazy-loaded with `React.lazy` + `Suspense`
- Copy tone follows Clean + Converting guidelines — no jargon, salon-owner language throughout

## What Does NOT Change
- Existing `/product`, `/ecosystem`, `/pricing`, `/demo` pages stay as-is
- PersonaExplorer on landing page stays — the dropdown is a navigation shortcut, not a replacement
- No backend changes, no database changes

