

# Redesign Hero Section — Full-Screen, Clearer Value Prop, Mockup Below Fold

## Problem

1. The hero section is not full-screen — content is cramped with the Command Center mockup visible immediately, making it feel cluttered.
2. The messaging ("Know exactly what to fix next") is catchy but doesn't clearly explain what Zura actually is — a full-stack salon management platform.
3. The dashboard mockup should only appear once the user scrolls down, keeping the hero clean and focused.

## Changes

### `src/components/marketing/HeroSection.tsx`

**1. Make the hero full-screen height**
- Change the section to `min-h-screen` with `flex items-center justify-center` so the headline + CTA occupy the full viewport.
- Remove the `pt-24 sm:pt-32 lg:pt-40` padding — use flexbox centering instead.

**2. Rewrite the subtitle for clarity**
- Current: "Zura watches your schedule, team, and numbers — and tells you the one thing that will make the biggest difference this week."
- New: "The all-in-one salon management platform — scheduling, team performance, payroll, inventory, and AI-powered insights — built for salons ready to scale."
- This makes it immediately clear Zura is full-stack software, not just an analytics tool.

**3. Move the DashboardMockup + narration strip + scroll anchor out of the hero section**
- Extract the mockup, phase narration, and scroll anchor into their own wrapper below the hero.
- The mockup will naturally appear only when users scroll past the full-screen hero.
- Keep the scroll anchor at the bottom of the hero pointing users downward.

**4. Add a concise descriptor line above the headline**
- Below the pill badge, add a small descriptor: "Salon Management Platform" in `text-xs tracking-widest uppercase text-slate-500` to immediately ground the category.

**5. Keep the scroll-down indicator**
- The bouncing "Scroll to explore" arrow stays at the bottom of the hero viewport to invite scrolling.

### `src/pages/PlatformLanding.tsx`

**6. Insert a standalone DashboardMockup section between HeroSection and StruggleInput**
- Create a simple wrapper that renders the `DashboardMockup` with the phase narration strip, appearing naturally below the fold.

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/HeroSection.tsx` | **Modify** — full-screen layout, clearer copy, remove mockup from hero |
| `src/pages/PlatformLanding.tsx` | **Modify** — add standalone mockup section after hero |

**2 files modified.**

