

# Continue Improving FAB Chat Modal UI

## Current Issues (from screenshot)
The modal is functional but still has room for refinement: the empty state feels vertically cramped, prompt pills lack visual depth, the tab area needs more polish, the input area could be more inviting, and the overall spacing/hierarchy can be tightened.

## Changes

### File 1: `src/components/dashboard/HelpFAB.tsx`
- Add a subtle inner gradient overlay at the top of the popover for depth (pseudo-element via a div)
- Refine TabsList with explicit `bg-card/60` background and `rounded-full` pill shape for the tab bar itself
- Style active TabsTrigger with `data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:rounded-full` for a clear selected state
- Add `rounded-2xl` to the outer popover for smoother corners

### File 2: `src/components/dashboard/help-fab/AIHelpTab.tsx`
**Empty State:**
- Increase the glow effect behind ZuraZIcon — larger blur radius and slightly stronger opacity
- Add a subtle ring/circle behind the icon for a contained feel: `w-14 h-14 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center`
- Add more vertical spacing between the description and prompt list (`mb-10`)
- Prompt pills: add a subtle left border accent (`border-l-2 border-l-primary/30`) and slightly increase padding for a more premium touch

**Chat Bubbles:**
- User bubbles: add a subtle shadow `shadow-sm` for lift
- Assistant bubbles: tighten the icon+text alignment

**Input Area:**
- Add a subtle gradient border-top instead of flat border: reuse the primary gradient line
- Make the send button more visible: `bg-primary/90 hover:bg-primary` with `text-primary-foreground`
- Add a subtle placeholder icon (sparkle or ZuraZ) inside the input on the left side

### File 3: `src/components/dashboard/help-fab/ChatLeadershipTab.tsx`
- Update the header to use `font-display` for the title and align with Zura tab styling
- Add a subtle background tint to the header area for separation

## Technical Details
- No new dependencies
- All styling via Tailwind utility classes
- Maintains existing functionality unchanged
- ~20 lines changed across 3 files

