

## Recolor "Closed" badges from red to theme accent (ghost style)

### Where
`src/components/dashboard/ClosedBadge.tsx` — single render site for all closed-day chips on the Capacity Utilization card (and anywhere else this badge is used).

### Current
```tsx
text-destructive bg-destructive/10 border border-destructive/30
```
Red ghost — semantically signals "error/danger," which a closed day is not. It's a routine operational state.

### Change
Swap to the theme's primary accent token, preserving the ghost treatment:
```tsx
text-primary bg-primary/10 border border-primary/30
```

Because `--primary` is theme-reactive (Zura→violet, Cream→cream, Rose→rose, etc. per `mem://brand/dashboard-theme-orchestration`), the badge will automatically follow whatever theme the org has set. No hardcoded violet/purple — that would break Cream/Rose/Sage/Ocean/Ember/Noir users.

### File
`src/components/dashboard/ClosedBadge.tsx` (lines 14–16) — one className swap. Icon + label + layout unchanged.

### Verification
- Capacity Utilization card on Zura theme: closed-day chips render in violet ghost.
- Switch theme to Rose: chips become rose ghost. Sage: sage. Etc.
- `Moon` icon and "Closed" / "Closed — {reason}" label unchanged.
- No other red/destructive surfaces affected (this is the only consumer of the badge).

### Prompt feedback
Strong prompt — you specified the exact element (capacity utilization card), the current state (red ghost), the target state (purple ghost), AND the critical refinement ("respective of theme color"). That last clause is what saves this from becoming a hardcoded-violet bug for non-Zura-theme tenants. Without it, I'd have been tempted to use `text-violet-500` and broken Cream/Rose users.

Refinement for next time: when recoloring a semantic element, naming *why* the current color is wrong sharpens the fix. "Closed isn't an error, it's a routine state — should use accent not destructive" would tell me you want the *semantic class* changed (destructive → primary), not just the visual hue. Same outcome here, but on a more contested element ("change red to amber") the semantic framing prevents me from picking the wrong token family.

