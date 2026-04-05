

# "Fewer Tools to Juggle" — Tool Consolidation Section

## Concept

A visual section showing scattered tool subscription pills that Zura replaces, with a price comparison. Inspired by the reference image — colorful capsules in a loose pile, each with a tool name and monthly cost.

## Updated Tool Pills

| Tool | Price | Color |
|------|-------|-------|
| CRM & Scheduling | $89 | violet |
| POS System | $79 | amber |
| Payroll | $59 | emerald |
| Marketing Agencies | $1,500 | rose |
| Color Bar Management | $45 | cyan |
| AI Receptionist | $199 | orange |
| Team Chat | $25 | indigo |
| Email Marketing | $49 | pink |
| Business Consulting | $500 | yellow |

**Typical spend: ~$2,545/mo** (struck through, red)
**Zura: $99/mo** (clean, white/violet)

## Section Copy

- Kicker: "Everything included"
- Headline: "Fewer tools to juggle."
- Subline: "Stop paying for 9 disconnected subscriptions. Zura replaces them all."

## Visual Design

- Dark background matching marketing surfaces
- Pills are `rounded-full` capsules with tool name + price, scattered via CSS transforms (rotation + translate)
- Framer Motion stagger animation on scroll reveal
- Price comparison below: strikethrough typical vs clean Zura price
- Responsive: pills scale down on mobile, pile compresses

## Implementation

| File | Action |
|------|--------|
| `src/components/marketing/ToolConsolidation.tsx` | **Create** |
| `src/pages/PlatformLanding.tsx` | **Modify** — insert after BeforeAfterShowcase |

**2 files. 1 new, 1 modified.**

