

# Enhance "Resume Setup" Button — Dark Fill + Bright Stroke + Bright Text

## Current Style
```
bg-amber-600 hover:bg-amber-700 text-white border-0
```
Solid amber fill, white text, no border. Reads as a standard solid CTA.

## What You're Going For

This is a **"Dark Glass CTA"** pattern — common in premium dark-mode interfaces:

```text
┌──────────────────────────────┐
│  Dark/transparent fill       │  ← recedes into dark card
│  Bright amber border         │  ← glowing outline draws the eye
│  Bright amber text           │  ← text pops without a loud fill
└──────────────────────────────┘
```

The design intent: instead of a loud solid-color button competing with the dark UI, the button **lives inside the dark surface** with only its stroke and text providing color. It feels integrated rather than overlaid. This is sometimes called a **"ghost accent"** or **"outlined CTA"** style.

## Change

**File: `BackroomDashboardOverview.tsx`** (line 114)

Replace the button classes:

**From:**
```
bg-amber-600 hover:bg-amber-700 text-white border-0
```

**To:**
```
bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:border-amber-500/70
```

This gives:
- **Dark fill**: `bg-amber-500/10` — near-transparent amber tint over the dark card
- **Bright stroke**: `border border-amber-500/50` — visible amber outline, brightens on hover
- **Bright inner text**: `text-amber-400` — warm amber text that stands out against the dark fill

One line change, one file.

