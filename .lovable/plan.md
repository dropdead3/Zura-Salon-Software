

# Auto-Collapse AI Response in StruggleInput

## Problem

After the AI responds to a user's struggle, the response card stays visible indefinitely, making the section feel static and taking up too much vertical space on the marketing page.

## Changes

### `src/components/marketing/StruggleInput.tsx`

**1. Add a 15-second auto-collapse timer**
- After `isLoading` transitions to `false` and `hasResponse` is true, start a 15-second timeout.
- When the timer fires, call `handleReset()` to clear the response, features, and query — returning the section to its initial interactive state.
- Cancel the timer if the user manually resets or submits a new query before the 15s elapses.

**2. Add a visible countdown indicator**
- Show a subtle progress bar or fading border at the bottom of the response card that depletes over 15 seconds, giving the user a visual cue that the answer will collapse.
- Use a simple CSS animation (`animate` with `transition: width 15s linear`) on a thin bar — no extra state needed.

**3. Pause auto-collapse on hover**
- If the user hovers over the response area, pause the countdown (clear the timeout, restart on mouse leave with remaining time).
- This prevents the answer from disappearing while someone is actively reading.

## Technical Notes

- Timer managed via `useEffect` watching `isLoading` and `hasResponse`.
- Hover pause uses `onMouseEnter`/`onMouseLeave` with a ref to track remaining time.
- The collapse animation uses `AnimatePresence` (already imported) for a smooth exit.

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/StruggleInput.tsx` | **Modify** — add auto-collapse timer with hover-pause and countdown bar |

**1 file modified.**

