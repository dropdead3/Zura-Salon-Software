

# Enhance "When Backroom Is Implemented" Recovery Banner

**File:** `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (lines 625–659)

## Current State
A simple `rounded-lg` card with `bg-success/[0.12]`, green border, and a subtle green glow shadow. Flat layout with left-side headline/number and right-side breakdown. Functional but doesn't stand out.

## Design Direction
Elevate to a premium, high-impact "value reveal" moment — the emotional climax of the pricing section. No shine effects. Instead, use layered depth, stronger visual hierarchy, and a subtle gradient accent.

## Changes

### 1. Outer wrapper — layered depth
Replace the current single `div` with a more impactful container:
- `rounded-xl` (Level 0 radius per design tokens)
- Gradient border effect using a wrapper div with `bg-gradient-to-br from-success/30 via-success/10 to-transparent p-px rounded-xl` — this creates a subtle gradient border without shine
- Inner div: `bg-card/90 backdrop-blur-xl rounded-[11px]` for the glass depth effect
- Remove the flat `shadow-[...]` glow

### 2. Header area — more presence
- Add a small success-colored dot indicator (`w-2 h-2 rounded-full bg-success`) before the title for a status-light feel
- Bump the title to `text-base` and keep uppercase tracking
- Add a thin `border-b border-success/10` separator after the header line

### 3. Body layout — two-column with stronger contrast
- Left column: Keep "You could recover" label + large animated number
- Bump the number size to `text-4xl md:text-5xl` for more impact
- Right column: Style the breakdown items with `bg-success/[0.06] rounded-lg px-4 py-3` to give them card-like presence instead of plain text rows
- Add a subtle left accent bar (`border-l-2 border-success/40`) to each breakdown row

### 4. Footer disclaimer
- Keep the small projection disclaimer text as-is, already subdued

### Summary of class changes (line 626 area)
```
// Outer: gradient-border wrapper
<div className="bg-gradient-to-br from-success/30 via-success/10 to-transparent p-px rounded-xl">
  <div className="bg-card/90 backdrop-blur-xl rounded-[11px] p-6 space-y-5">
    // Header with dot indicator
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-success" />
      <p className="font-display text-base text-success uppercase tracking-wide font-medium">
        When Backroom Is Implemented
      </p>
    </div>
    <p className="font-sans text-xs text-muted-foreground -mt-3">...</p>
    
    // Two-column body (same flex layout, enhanced right side)
    // Left: bigger number
    // Right: breakdown rows with bg-success/[0.06] rounded-lg + left accent border
    
    // Footer disclaimer unchanged
  </div>
</div>
```

This creates a premium, layered card that reads as the most important element on the page without relying on shine or glow animations.

