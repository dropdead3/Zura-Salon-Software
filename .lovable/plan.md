

# Dynamic Typing Placeholder for StruggleInput

## Problem

The textarea uses a static placeholder ("I'm struggling with..."). The user wants the SUGGESTIONS array to cycle through as animated typing text inside the textarea — like a typewriter effect showing example problems before the user starts typing.

## Approach

Add a custom typing animation hook that cycles through the SUGGESTIONS array, typing each one character by character, pausing, then deleting and moving to the next. This replaces the static `placeholder` attribute.

### Typing Animation Logic

- When `query` is empty and textarea is not focused, show animated placeholder text
- Cycle through SUGGESTIONS with: type in (40ms/char) → pause (2s) → delete (25ms/char) → pause (300ms) → next
- When user focuses the textarea or starts typing, immediately hide the animated text and show real input
- Use a `useEffect` with `setInterval`/`setTimeout` to drive the animation loop

### Implementation Details

1. **New state**: `placeholderText` (the currently visible animated string), `isTyping` (animation active flag), `isFocused`
2. **Animation effect**: Runs only when `query === ''` and `!isFocused` — types/deletes through SUGGESTIONS in a loop
3. **Render**: When `query` is empty and animation is active, render the animated text as a positioned overlay `<span>` inside the textarea container (not as the native `placeholder` attr, since we need character-by-character control)
4. **Styling**: The animated text uses `text-slate-500` (same as current placeholder) with a blinking cursor character `|` appended

### Visual Result

The textarea appears to type out: `With my current salon software, I cannot adjust commission rates per level...` then erases, then types the next suggestion — exactly like the screenshot reference.

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/StruggleInput.tsx` | **Modify** — add typing animation effect, overlay span, focus handling |

**1 file modified.**

