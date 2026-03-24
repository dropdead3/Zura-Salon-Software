

## Luxury Press Feedback on PIN Numpad Buttons

**Problem:** The numpad buttons currently use `active:bg-violet-600/20` with a basic `transition-colors` — the purple flash is instant and snaps back immediately. No lingering feedback to show which digit was just pressed.

### Change — `src/components/dock/DockPinGate.tsx`

Replace the plain CSS `active:` state with a CSS approach using a longer `transition-duration` on release, creating a "press glow that slowly fades":

**Button class update (digit buttons, line ~210):**

```
// Before
active:bg-violet-600/20 transition-colors

// After — luxury ease-out glow
active:bg-violet-500/25 active:shadow-[inset_0_0_20px_rgba(139,92,246,0.15)] 
active:scale-[0.97] 
transition-all duration-500 ease-out
```

Key changes:
1. **Longer transition duration:** `transition-colors` → `transition-all duration-500 ease-out` — the release fade takes 500ms, giving a visible "afterglow" effect
2. **Richer active color:** `violet-600/20` → `violet-500/25` — slightly brighter, warmer violet
3. **Inset glow shadow:** `active:shadow-[inset_0_0_20px_rgba(139,92,246,0.15)]` — soft inner glow on press
4. **Subtle scale:** `active:scale-[0.97]` — minimal press-down feel that eases back smoothly over 500ms
5. **Remove hover state** or soften it: `hover:bg-[hsl(var(--platform-bg-hover))]` stays but won't conflict

The 500ms `ease-out` on release means the purple tint and scale visibly return to normal over half a second — you can see which button was just tapped.

One file, one className string update.

