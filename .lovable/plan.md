

# Before/After Section — Layout & UI Enhancement

## Current Issues
- Cards feel flat and sparse — thin borders on a dark `muted/20` background lack contrast
- List items are small (`text-sm`) with low-opacity icons (`text-destructive/60`) — hard to scan
- No visual connection between paired items (left problem → right solution)
- Cards have identical visual weight — the "With Backroom" card should feel like the upgrade
- Section heading is centered but the cards beneath don't feel anchored to it
- No visual separator or accent between the two cards on desktop

## Planned Changes

### 1. Elevate the "With" card
- Give the success card a slightly stronger background (`bg-success/[0.05]`) and a subtle inner glow or elevated shadow (`shadow-md`) to make it feel like the "winning" side
- Keep the "Without" card deliberately muted (`bg-card/50`, `border-destructive/15`) so it recedes

### 2. Improve list readability
- Bump list text from `text-sm` to `text-[15px]` for better scanability
- Increase icon opacity to full color (`text-destructive` / `text-success`) instead of 60%
- Add slightly more vertical spacing between items (`space-y-5`)

### 3. Add a center divider on desktop
- Insert a vertical "→" or arrow accent between the two columns at `md` breakpoint using a pseudo-element or absolute-positioned element — visually communicates "transformation"

### 4. Pair items visually
- Since both lists have exactly 7 items that correspond 1:1, align their heights so each row sits at the same vertical position on desktop, making the before→after mapping obvious

### 5. Refine section container
- Strengthen the inset shadow and add a subtle top border accent (`border-t border-border/40`)
- Tighten section padding slightly (`pt-12 md:pt-16` → keep, `pb-20 md:pb-24` → `pb-16 md:pb-20`)

### 6. Card header refinement
- Make the icon box slightly larger on desktop and add a subtle ring treatment for polish

## File Changed
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — Lines 610–683

