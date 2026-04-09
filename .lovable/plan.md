

# Enhance Chat Modal UI and Design

## Current State
The chat modal works but feels flat — prompt pills blend in, the empty state is sparse, the input area is basic, and there's no visual refinement that matches the premium Zura brand. The screenshot confirms low contrast and a utilitarian feel.

## Design Direction
Elevate to a polished, glass-aesthetic chat experience that feels like an executive AI assistant — not a basic help widget. Key themes: subtle gradients, refined spacing, animated touches, and stronger visual hierarchy.

## Changes

### File 1: `src/components/dashboard/HelpFAB.tsx`
- Increase popover size from `w-[380px] h-[480px]` to `w-[400px] h-[520px]` for more breathing room
- Add `rounded-2xl` and refined glass background: `bg-card/95 backdrop-blur-xl border border-border/40 shadow-[0_16px_64px_rgba(0,0,0,0.4)]`
- Style the tab header: add a subtle gradient background, refine tab trigger styles with `font-display text-xs tracking-wider uppercase` for brand consistency
- Add a thin `bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 h-px` accent line below the header

### File 2: `src/components/dashboard/help-fab/AIHelpTab.tsx`
**Empty State:**
- Add a subtle radial gradient glow behind the ZuraZIcon (pulse animation on hover)
- Style prompt pills as vertical list items with left-aligned text, a subtle arrow/sparkle icon, and hover slide animation — more premium than tiny rounded pills
- Refine description text opacity and spacing

**Chat Bubbles:**
- User bubbles: keep `bg-primary` but add `rounded-2xl rounded-br-md` for chat-app feel (tail on sender side)
- Assistant bubbles: `bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl rounded-bl-md` with a small ZuraZIcon avatar preceding the first assistant message
- Add subtle fade-in animation on new messages

**Loading State:**
- Replace `Loader2` spinner with the `DotsLoader` component (already exists) for a cleaner thinking indicator
- Add "Zura is thinking..." with the ZuraZIcon pulsing

**Input Area:**
- Restyle as a rounded-full input bar with integrated send button (pill-style, similar to iMessage/ChatGPT)
- Input: `rounded-full bg-muted/50 border-border/40 pl-4 pr-12` with the send button absolutely positioned inside the input container
- Send button: circular, primary color, smooth scale animation on hover

### File 3: `src/components/dashboard/help-fab/ChatLeadershipTab.tsx`
- Update the header section to match the refined style: remove `bg-muted/30`, use cleaner spacing
- Style member items with `rounded-xl` and refined hover state

## Technical Details
- All animations use `transition-all duration-200` or framer-motion for consistency
- No new dependencies — uses existing framer-motion, DotsLoader, ZuraZIcon
- Maintains all existing functionality (streaming, scroll, keyboard shortcuts)
- Two files primarily changed (AIHelpTab, HelpFAB), minor touch on ChatLeadershipTab

