

## Enhance Lock FAB — Larger Icon + Deeper Glass Morphism

### Change — `src/components/dock/DockLockFAB.tsx`

1. **Larger button:** `w-12 h-12` → `w-14 h-14`
2. **Larger icon:** `w-5 h-5` → `w-6 h-6`
3. **Stronger blur:** `backdrop-blur-xl` → `backdrop-blur-2xl`
4. **More visible glass:** `bg-white/[0.06]` → `bg-white/[0.08]`, border `border-white/[0.12]` → `border-white/[0.15]`
5. **Double ring effect:** Add `ring-1 ring-white/[0.06]` for an outer glow ring
6. **Enhanced shadow:** `shadow-lg shadow-black/20` → `shadow-xl shadow-black/30`

One file, class-only update.

