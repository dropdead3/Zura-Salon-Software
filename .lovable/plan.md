

# Tool Consolidation — Jumbled Pile Layout

## Problem

The pills currently render in a clean flex-wrap grid with tiny offsets. They look organized, not chaotic. The reference image (second screenshot) shows pills physically overlapping, stacked at steep angles, forming a messy heap — like tools dumped on a table.

## Approach

Switch from `flex-wrap` to a `relative` container with absolutely positioned pills. Each pill gets aggressive x/y offsets and rotations to create a dense, overlapping pile centered in the section. The pile should feel compact and messy — not spread across the full width.

## Updated Tool Positions

Each tool gets much larger offsets and steeper rotations to create true overlap:

```text
Layout concept (approximate positions):

         [CRM $89]·····
    [AI Chat $24]  [AI Images $29]  [CRM $20]
  [Website $20] [Invoicing $23] [SEO] [Payments]

→ Translated to Zura tools with heavy overlap:

              ╔═══════════════╗
         ┌────┤  CRM & Sched  ├──┐
    ┌────┤    ╚═══════════════╝  │
    │ POS├──┐   ┌─Marketing──┐   │
    └────┘  │   └────────────┘   │
       ┌Payroll┐  ┌Color Bar┐    │
       └───────┘  └─────────┘ ┌──┤
    ┌AI Recept┐ ┌Team Chat┐  │  Email
    └─────────┘ └─────────┘  └──┘
         ┌─Biz Consulting─┐
         └─────────────────┘
```

## Changes to `ToolConsolidation.tsx`

1. **Container**: Replace `flex flex-wrap` with `relative` container with a fixed height (~220px desktop, ~260px mobile) to allow absolute positioning
2. **Pill positions**: Each tool gets `position: absolute` with specific `top/left` percentages plus `rotate` for a jumbled look — pills overlap significantly
3. **Rotations**: Range from -18° to +15° (much steeper than current -8° to +7°)
4. **Animation**: Keep stagger entrance but animate from scattered chaos positions to their final jumbled positions (they start even more scattered, then settle into the pile)
5. **z-index**: Vary per pill so some visually sit on top of others

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/ToolConsolidation.tsx` | **Modify** — absolute positioning, aggressive offsets/rotations, fixed-height container |

**1 file modified.**

