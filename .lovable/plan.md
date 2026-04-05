

# "Zura In A Nutshell" — Feature Showcase Section

## Concept

A new marketing section inspired by the Nudge reference: alternating left-text/right-visual and right-text/left-visual rows, each showcasing a core Zura feature with a category pill, headline, description, and a static mockup visual that accurately represents the built product.

## Features to Showcase (8 rows, alternating layout)

| # | Category Pill | Headline | Visual Mockup |
|---|---|---|---|
| 1 | Client Management | Know every client. Not just their name. | CRM card: client profile with visit count, lifetime spend, retention badge, notes preview |
| 2 | Scheduling | Your book, optimized automatically | Calendar grid mockup with colored appointment blocks, utilization bar |
| 3 | Point of Sale | Ring up. Track. Move on. | Transaction card with service line items, tip, payment method, total |
| 4 | Analytics & Reporting | See what's actually happening | Mini dashboard: revenue donut, utilization %, retention trend sparkline |
| 5 | Onboarding & Hiring | From hire to chair in days, not weeks | Onboarding checklist mockup with progress steps (license, training, access) |
| 6 | Payroll & Commission | Pay your team right. Every time. | Payroll summary: commission tiers, tip breakdown, total payout |
| 7 | Team Chat | One place for your team to talk | Chat mockup with message bubbles, team member avatars, channel name |
| 8 | Website Builder | Your front door. Always on brand. | Browser chrome mockup showing a salon landing page with hero, nav, booking CTA |

## Layout Pattern

Each row is a two-column grid (`md:grid-cols-2`) with the text side and visual side swapping via `md:order-1`/`md:order-2` on odd/even rows. On mobile, text always stacks above the visual.

```text
Row 1:  [ Text ←──────── | ──────── Visual → ]
Row 2:  [ ← Visual ──── | ────── Text → ]
Row 3:  [ Text ←──────── | ──────── Visual → ]
...
```

## Visual Mockup Style

Each visual is a **static, code-rendered mockup** (not screenshots) styled to match the marketing dark surface:
- Container: `rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6`
- Inner elements use `bg-white/[0.06]`, violet/emerald/amber accents
- Designed to feel like a product screenshot but built with Tailwind — lightweight, responsive, no images needed
- Each mockup is a small self-contained component within the file

## Text Side Style

- Category pill: `rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-slate-400`
- Headline: `font-display text-xl sm:text-2xl text-white tracking-tight`
- Description: `font-sans text-sm sm:text-base text-slate-400 leading-relaxed`
- All hardcoded marketing colors (no semantic tokens)

## Section Header

- Overline: "ZURA IN A NUTSHELL" (violet, tracking-wide)
- Heading: "Everything your salon runs on. One platform."
- Subtext: "Built for operators who need real tools — not another app to manage."

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/ZuraInANutshell.tsx` | **Create** — full section with 8 feature rows, each with inline mockup component |
| `src/pages/PlatformLanding.tsx` | **Modify** — insert `<ZuraInANutshell />` after `<ToolConsolidation />` (before OutcomeMetrics) |

**2 files touched. 1 new. 1 modified.**

