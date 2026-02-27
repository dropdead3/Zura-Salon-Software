

## Fix: Account Owner Badge "Fritzing" Shine Effect

The `animate-shine` animation shifts `backgroundPosition` across the gradient, which on the Account Owner badge (and Super Admin / GM badges) causes a visible background oscillation — the lighter `via-*` band sweeps back and forth, making the badge look glitchy.

### Root Cause

In `src/lib/roleBadgeConfig.ts`, these badges combine:
- `bg-gradient-to-r from-stone-700 via-stone-600 to-stone-700` (color gradient)
- `bg-[length:200%_100%]` (stretched background)
- `animate-shine` (moves backgroundPosition 200% → -200% in 1.2s)

The gradient IS the shine — so the entire badge background visibly shifts, creating the "fritz."

### Fix: Static Gradient + CSS Pseudo-Element Shine

**File: `src/lib/roleBadgeConfig.ts`**

1. Remove `bg-[length:200%_100%] animate-shine` from all three shimmer badges (Account Owner, Super Admin, Admin/GM)
2. Replace with a static gradient and a dedicated `shine-badge` class

**File: `src/components/dashboard/SuperAdminTopBar.tsx`**

3. Add a `relative overflow-hidden` wrapper to badge `<div>` and insert a `::after` pseudo-element shine sweep via a small inline style or utility class

**Alternative (simpler, equally premium):**

Remove the `animate-shine` entirely from all three badges. The gradient itself already communicates premium status. The shimmer was causing more harm than good. Keep `bg-gradient-to-r` static — no animation, no `bg-[length:200%_100%]`.

This is the recommended approach: static gradients look clean and executive. The animation was producing visual noise rather than elegance.

### Changes

- `src/lib/roleBadgeConfig.ts` — Remove `bg-[length:200%_100%] animate-shine` from `super_admin`, `admin`, and `ACCOUNT_OWNER_BADGE` colorClasses

