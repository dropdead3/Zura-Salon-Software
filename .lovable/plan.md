

## Remove Emoji from Cha-Ching Toast

The money bag emoji (💰) in `ChaChingToast.tsx` breaks the luxury aesthetic. Replace it with a subtle, on-brand visual element.

### File: `src/components/dashboard/ChaChingToast.tsx`

- Remove the `<span>💰</span>` emoji accent entirely
- Replace with a second subtle icon or simply let the layout breathe without a right-side element — the dollar-sign icon on the left + the silver shine wrapper already carry enough visual weight
- Option: Add a small animated green dot or a subtle checkmark circle on the right to signal "completed transaction" without kitsch

**Recommended approach**: Remove the emoji entirely. The SilverShineWrapper + DollarSign icon + Termina typography already convey premium. Less is more.

### Change

Line 37 — delete the emoji span:
```tsx
// REMOVE:
<span className="text-2xl flex-shrink-0" aria-hidden>💰</span>
```

