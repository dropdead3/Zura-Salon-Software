

## Problem

The popover border uses `border border-border/30` which is a subtle static stroke. The top menu bar and main dashboard cards use the animated silver-shine stroke effect (`silver-shine-border` from `silver-shine.css`). The user wants the popover to match that same animated shine border.

## Plan

**File:** `src/components/dashboard/ViewAsPopover.tsx`

Wrap the `PopoverContent` inner content with the silver-shine border effect. Since `PopoverContent` is portaled by Radix, the cleanest approach is to apply the shine classes directly to the content container:

1. Remove `border border-border/30 rounded-xl` from the `PopoverContent` className
2. Add `silver-shine-border rounded-xl p-[1px]` to the `PopoverContent` className (matching `tokens.shine.border`)
3. Wrap the inner content (Tabs) in a div with `silver-shine-inner block bg-card/80 backdrop-blur-xl backdrop-saturate-150 rounded-[calc(theme(borderRadius.xl)-1px)]` to mask the interior and maintain the glass aesthetic
4. Add `import '@/styles/silver-shine.css'` if not already imported

This gives the popover the same rotating silver shine stroke as the nav bar and main cards, creating visual cohesion across all elevated surfaces.

