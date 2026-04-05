

# Enhanced StruggleInput Response Layout

## Current Issues

1. Feature cards render in a flat 3-column grid with no visual hierarchy — they all look identical
2. The AI response sits in a plain bordered box below, visually disconnected from the feature cards
3. No clear visual separation between "what Zura feature solves this" and "how it solves it"
4. The response area lacks structure — it's just a markdown dump

## Proposed Layout (Post-Response State)

```text
┌─────────────────────────────────────────────────┐
│  [textarea with typing animation]               │
│  0/300                        [Show me how →]   │
│  ─────────────────────────────────────────────   │
│  pill  pill  pill  pill                          │
└─────────────────────────────────────────────────┘

          ↓  (after submit, response area)

┌──────────────────────────────────────────────────┐
│                                                  │
│  ┌─ FEATURED SOLUTION ───────────────────────┐   │
│  │  ⚡ PAYROLL                                │   │
│  │  Payroll Hub                               │   │
│  │  Automate tips, commissions, and payroll   │   │
│  │                                            │   │
│  │  [Learn more →]                            │   │
│  └────────────────────────────────────────────┘   │
│                                                  │
│  Also relevant:                                  │
│  ┌──────────┐  ┌──────────┐                      │
│  │ Feature2 │  │ Feature3 │    (smaller cards)   │
│  └──────────┘  └──────────┘                      │
│                                                  │
│  ── How Zura solves this ──────────────────────   │
│                                                  │
│  [Streamed AI markdown response with improved    │
│   typography — violet accent on feature names,   │
│   bullet points styled cleaner]                  │
│                                                  │
│  ↻ Ask another question    Book a demo →         │
└──────────────────────────────────────────────────┘
```

## Key Design Changes

### 1. Primary Feature Card (Hero Treatment)
- First matched feature gets a larger, highlighted card with a subtle violet left border accent and a gradient background (`bg-gradient-to-br from-violet-500/10 to-transparent`)
- Category label in violet, feature name larger (`text-lg`), tagline visible
- Optional "Learn more" link if we have a route

### 2. Secondary Features (Compact Row)
- Remaining features render as smaller inline pills/chips below a "Also relevant:" label
- Keeps the response area clean without a heavy grid

### 3. Response Container Improvements
- Add a subtle section label: "How Zura solves this" with a thin violet divider line
- Better markdown prose styling — slightly larger line-height, violet-colored bold feature names
- Cleaner visual weight overall

### 4. Overall Container
- Widen max-width from `max-w-3xl` to `max-w-4xl` to give the response more breathing room
- The entire response area (features + AI text + actions) lives in one cohesive card instead of separate disconnected boxes

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/StruggleInput.tsx` | **Modify** — restructure response layout with hero feature card, secondary chips, section divider, unified container |

**1 file modified.**

