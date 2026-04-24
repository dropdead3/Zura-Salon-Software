

## Goal
Make the top cap read as a **thicker continuation of the card's own stroke** — same neutral border color, just heavier at the top — instead of a saturated category/status-colored accent. Ghost UI style: structural, quiet, integrated with the card edge.

## Why the current version reads wrong
In `src/components/dashboard/schedule/AppointmentCardContent.tsx`, both accent overlays currently colorize the cap to the **category color** (line 140: `border: 1.25px solid ${catColor.text}`) or the **status border class** (line 708: `statusColors.border`). That makes the cap fight the card content as a *second* color layer. You want it to feel like the card's own border just got thicker at the top.

## Fix
File: `src/components/dashboard/schedule/AppointmentCardContent.tsx`

### 1. Switch both accent overlays to neutral border color
Replace the colored stroke with the card's actual border token (`hsl(var(--border))`), and bump weight to `2.5px` so it reads as deliberate edge thickness rather than a hairline.

**Category-color overlay (lines 136–146):**
```tsx
{useCategoryColor && !displayGradient && !BLOCKED_CATEGORIES.includes(appointment.service_category || '') && (
  <div
    className="absolute inset-0 pointer-events-none z-[3] rounded-[10px]"
    style={{
      border: '2.5px solid hsl(var(--border))',
      opacity: 0.85,
      WebkitMaskImage: 'linear-gradient(to bottom, black 0px, black 10px, rgba(0,0,0,0.6) 14px, transparent 18px)',
      maskImage: 'linear-gradient(to bottom, black 0px, black 10px, rgba(0,0,0,0.6) 14px, transparent 18px)',
    }}
  />
)}
```

**Status-color overlay (lines 703–716):**
```tsx
{!useCategoryColor && !displayGradient && (
  <div
    className="absolute inset-0 pointer-events-none z-[3] rounded-[10px]"
    style={{
      border: '2.5px solid hsl(var(--border))',
      opacity: 0.85,
      WebkitMaskImage: 'linear-gradient(to bottom, black 0px, black 10px, rgba(0,0,0,0.6) 14px, transparent 18px)',
      maskImage: 'linear-gradient(to bottom, black 0px, black 10px, rgba(0,0,0,0.6) 14px, transparent 18px)',
    }}
  />
)}
```

Both branches now share the **identical** treatment — neutral border token, 2.5px stroke, same tapered mask — which is the whole point of ghost UI: one quiet structural cue, repeated everywhere.

### 2. Tuning rationale
- **`hsl(var(--border))`** — matches the card's own 1px border exactly, in both light and dark mode. This is what makes it read as "edge thickening" instead of "color accent."
- **`2.5px`** — thick enough to register as intentional weight on the top edge against the card's existing 1px border, but not so thick it competes with content.
- **`0.85` opacity** — softens the doubling effect against the existing border underneath.
- **Mask `0→10→14→18`** — keeps the top edge crisp through both rounded corners, then eases out down the sides over ~8px (no hard chop, no bracket feel).

### 3. What stays exactly the same
- All other card chrome (sheen overlay, lit-edge inner ring, base 1px border, shadow stack, hover lift)
- 1px overlap gap math
- All status pills, NC/RC chips, stylist avatars, multi-service bands
- Cancelled hatch, no-show ring/dot, selected ring
- Category color still drives the **card fill** (pink, blue, etc.) — only the cap stops being colorized

## QA
- Top edge of every card reads as a thicker, neutral stroke that wraps both rounded corners
- Cap color is identical across category-colored cards and status-colored cards (ghost UI consistency)
- Side stroke fades smoothly down ~18px, no hard bracket cutoff
- In dark mode, cap matches the dark border token (no white bleed)
- Card fill colors (pink/blue/sage) are untouched
- Selected ring, no-show dot, cancelled hatch all still render cleanly

## Enhancement suggestion
Once this lands, the next move is extracting both branches into a single `<CardEdgeCap />` primitive that takes only `wrapDepthPx` and `weightPx` props (no color prop — it's always the border token). That hard-codes the ghost UI rule into the API: the cap can't drift back into being a color accent because the prop doesn't exist.

