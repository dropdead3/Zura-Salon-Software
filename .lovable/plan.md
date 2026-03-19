

# Standardize Toast Styling with Design Tokens

## Problem
Toasts currently use inconsistent border radii — `rounded-full` on sonner defaults (the screenshot shows this pill shape), `rounded-xl` on ChaChingToast, `rounded-2xl` on SmartActionToast. Toasts should be rectangular with slightly rounded corners, never fully rounded.

## Design Decision
Toast radius: **`rounded-lg`** (8px) — consistent with Level 1 radius in the design system (inner cards, subcards). This gives a clean rectangle with subtle rounding.

## Changes

### 1. Add `toast` token group to `design-tokens.ts`
```ts
toast: {
  /** Toast container: glass card with slight rounding — NEVER rounded-full or rounded-xl */
  container: 'bg-card/80 backdrop-blur-xl border-border/40 shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)] rounded-lg',
  /** Toast radius only — for overriding in third-party toast wrappers */
  radius: 'rounded-lg',
},
```

### 2. Update `sonner.tsx` — change `rounded-full` to `rounded-lg`
Line 30: `group-[.toaster]:rounded-full` → `group-[.toaster]:rounded-lg`
Also update actionButton and cancelButton from `rounded-full` to `rounded-md`.

### 3. Update `toast.tsx` (Radix toast) — change `rounded-xl` to `rounded-lg`
In `toastVariants` cva string, replace `rounded-xl` with `rounded-lg`.

### 4. Update `ChaChingToast.tsx` — change inner div `rounded-xl` to `rounded-lg`
Line 17: `rounded-xl` → `rounded-lg`

### 5. Update `SmartActionToast.tsx` — change `rounded-2xl` to `rounded-lg`
Line 74: Card className `rounded-2xl` → `rounded-lg`

### 6. Update `AchievementNotificationToast.tsx` — change `rounded-2xl` to `rounded-lg`
Line 91: `rounded-2xl` → `rounded-lg`

### 7. Update `ServiceAddonToast.tsx` — change `rounded-xl` to `rounded-lg`
Line 34: `rounded-xl` → `rounded-lg`

### 8. Add toast rules to `design-rules.ts`
Add a `TOAST_RULES` section documenting that toasts must use `rounded-lg`, never `rounded-full`/`rounded-xl`/`rounded-2xl`.

### Files to edit
1. `src/lib/design-tokens.ts`
2. `src/lib/design-rules.ts`
3. `src/components/ui/sonner.tsx`
4. `src/components/ui/toast.tsx`
5. `src/components/dashboard/ChaChingToast.tsx`
6. `src/components/team-chat/SmartActionToast.tsx`
7. `src/components/achievements/AchievementNotificationToast.tsx`
8. `src/components/dashboard/schedule/ServiceAddonToast.tsx`

