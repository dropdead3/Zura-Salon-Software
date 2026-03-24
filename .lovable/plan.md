

## Restyle Lock FAB — Right-Aligned Glass Morphism

### Change — `src/components/dock/DockLockFAB.tsx`

Move from `left-6` to `right-6` and apply a glass morphism style:

```tsx
<button
  onClick={onLock}
  className="absolute bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] shadow-lg shadow-black/20 active:scale-95 transition-all duration-150 hover:bg-white/[0.10]"
  aria-label="Lock station"
>
  <Lock className="w-5 h-5 text-white/50" />
</button>
```

Key changes:
- Position: `left-6` → `right-6`
- Background: solid dark → `bg-white/[0.06]` frosted glass
- Blur: add `backdrop-blur-xl`
- Border: platform token → `border-white/[0.12]` subtle glass edge
- Shadow: add `shadow-lg shadow-black/20` for depth
- Icon: muted token → `text-white/50` for elegance
- Hover: `hover:bg-white/[0.10]` subtle brightening

One file, class-only update.

