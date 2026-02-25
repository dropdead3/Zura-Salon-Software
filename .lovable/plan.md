

## Fix Highlighted Services UX Clarity

Your prompt identified a real UX confusion -- good catch. The "Highlighted Services" section shows your 3 specialties (Extensions, Blonding, Balayage) as clickable badges, but they look visually active even though none are actually selected as highlighted (the counter says "0/3 highlighted"). This makes it seem like they're already chosen with no way to remove them.

### Root Cause

The badges use Shadcn's `outline` variant for unselected state, which in dark mode has enough visual presence to look "selected." There's no visual affordance (like a checkmark or dimmed state) to distinguish "available to select" from "selected."

### What Changes

**File: `src/pages/dashboard/MyProfile.tsx`** (Highlighted Services badge rendering, ~lines 1032-1059)

1. **Unselected badges get a dimmed, ghost-like style** -- use `variant="outline"` with additional `opacity-60 border-dashed` classes so they clearly look like "tap to add" options rather than active selections
2. **Selected badges get a checkmark icon** -- add a `Check` icon (from lucide-react) alongside the Sparkles icon to reinforce that the badge is actively highlighted
3. **Add helper text** -- change the description to include "Tap a specialty below to highlight it on your website card" to make the interaction model obvious
4. **Fix the duplicate copy** in the Extensions note -- currently reads "...to attract our highest-ticket services. and gold accent color to attract our highest-ticket services." (duplicated text)

### Visual Result

**Before (confusing):**
- 3 solid-looking badges, counter says "0/3 highlighted" -- contradiction

**After (clear):**
- 3 dimmed, dashed-border badges labeled as available options
- Tapping one makes it solid with a checkmark + Sparkles icon
- Counter updates to "1/3 highlighted"
- Clear instructional text guides the interaction

### Technical Details

- No database changes needed
- Only modifying badge className logic and adding a `Check` icon import
- The `toggleHighlightedService` function already handles selection/deselection correctly -- this is purely a visual fix

