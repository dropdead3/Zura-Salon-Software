

# Replace FAB & AI Help Tab Icons with ZuraZIcon

## What's Changing

The HelpFAB button currently uses `MessageCircleQuestion` (lucide) as its icon, and the AIHelpTab uses `ZuraAvatar` (a plain "Z" letter in a circle). Both should use the branded `ZuraZIcon` for consistent AI identity.

## Changes

### File 1: `src/components/dashboard/HelpFAB.tsx`
- Replace `MessageCircleQuestion` import with `ZuraZIcon` import
- FAB button (non-schedule, non-open state): replace `<MessageCircleQuestion>` with `<ZuraZIcon className="h-6 w-6" />`
- Keep the `X` icon for the open/close state — that's functional, not branding

### File 2: `src/components/dashboard/help-fab/AIHelpTab.tsx`
- Replace `ZuraAvatar` import with `ZuraZIcon` import
- In the empty state, replace `<ZuraAvatar size="lg" className="mb-4" />` with `<ZuraZIcon className="w-12 h-12 text-primary mb-4" />`

### File 3: `src/components/ui/ZuraAvatar.tsx`
- Replace the plain text "Z" with the `ZuraZIcon` SVG component inside the circle, so any other consumers also get the branded icon

Two files changed, ~4 lines each. No logic changes.

