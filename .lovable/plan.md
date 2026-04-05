

# Founder Quote Section for Marketing Landing Page

## Concept

A clean, editorial-style founder quote section inspired by the Nudge reference — large pull-quote with highlighted key phrases, founder illustration/photo on the left, name + title + company below the quote. Matches the marketing dark surface palette.

## Layout

```text
┌────────────────────────────────────────────────────────┐
│                                                        │
│   ┌──────────┐    "Zura gives us visibility we        │
│   │          │     never had. It helps us [monitor     │
│   │  Photo   │     margins], reinforce [team           │
│   │          │     structure], and provide daily        │
│   │          │     clarity, [significantly improving]   │
│   └──────────┘     our operations."                    │
│                                                        │
│                    Sarah Mitchell                       │
│                    Founder, Luxe Collective             │
│                                                        │
│                    LUXE COLLECTIVE                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Design Details

- **Section**: Full-width, clean background — `bg-[#FAF9F7]` (warm off-white, like the reference) to break from the dark marketing surface and create visual breathing room
- **Two-column grid**: `md:grid-cols-[1fr_1.5fr]` — photo left, quote right
- **Photo**: Rounded corners, illustration/watercolor style placeholder (a styled `div` with initials since we don't have a real photo)
- **Quote**: Large serif or display text (`font-display text-2xl sm:text-3xl lg:text-4xl`), dark text (`text-slate-900`), with generous `leading-snug`
- **Highlighted words**: Key phrases wrapped in `<span>` with `bg-amber-100/60 px-1 rounded-sm` — subtle warm highlight like the reference image
- **Attribution**: Name in `font-sans text-base text-slate-900`, title in `text-slate-500 text-sm`, company name below in `font-display text-xs tracking-[0.15em] text-slate-400`
- **Scroll animation**: `framer-motion` fade-in on viewport entry

## Highlighted Phrases

Pre-selected key phrases get the warm highlight treatment:
- "visibility we never had"
- "monitor margins"
- "significantly improving"

These are hardcoded in the component as a render helper that wraps matching substrings.

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/FounderQuote.tsx` | **Create** — editorial quote section with highlighted phrases |
| `src/pages/PlatformLanding.tsx` | **Modify** — insert `<FounderQuote />` after `<ZuraInANutshell />` (before OutcomeMetrics) |

**2 files touched. 1 new. 1 modified.**

