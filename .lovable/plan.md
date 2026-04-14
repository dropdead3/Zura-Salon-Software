

## Problem

When a new reader is registered to a terminal location, the user must manually navigate to the Display tab and click "Use Default Luxury Splash" to brand it. This should happen automatically.

## Solution

After a reader is successfully registered via `useRegisterReader`, automatically generate and push the default luxury splash screen to that terminal location (if it doesn't already have one active).

### Changes

**File: `src/hooks/useStripeTerminals.ts`**

Expand `useRegisterReader` to accept the org's logo URL, business name, and current color theme. In `onSuccess`, fire an async side-effect that:

1. Checks if the terminal location already has an active splash screen (via `get_splash_screen` action)
2. If not active, generates the default luxury splash using `generateDefaultSplash()`
3. Pushes it to the terminal location via `upload_splash_screen` action
4. Shows a secondary toast: "Splash screen applied to reader"

This keeps the registration itself fast (fire-and-forget for the splash) and only applies when no splash exists yet — so manually customized splash screens aren't overwritten.

**Alternative approach (simpler):** Instead of adding parameters to `useRegisterReader`, create a wrapper hook or handle this in the UI component that calls `registerReader.mutate()`. Let me check where registration is triggered from.

Actually, the cleanest approach: add the auto-splash logic directly in `useRegisterReader`'s `onSuccess` callback by accepting optional splash parameters. But hooks can't access org context internally without being called from the right component tree.

**Recommended approach:** Handle it at the call site. After `registerReader` succeeds, the calling component triggers splash generation + upload. This requires:

1. Finding the component that calls `useRegisterReader`
2. Adding a post-registration effect there that generates and pushes the splash

Let me refine — the simplest path is to add an `onSuccess` callback option to the mutation call site, since react-query supports per-call `onSuccess` via `mutate(vars, { onSuccess })`.

### Implementation

1. **`src/hooks/useStripeTerminals.ts`** — No changes needed to the hook itself

2. **Registration call site component** (likely in the Fleet tab) — After successful registration:
   - Import `generateDefaultSplash` and the splash upload action
   - Get org logo, business name, and color theme from context
   - Call `generateDefaultSplash()` then `invokeTerminalAction('upload_splash_screen', ...)` 
   - Toast: "Splash screen applied to reader"
   - This runs as fire-and-forget so registration UX stays instant

3. **`src/hooks/useStripeTerminals.ts`** — Export `invokeTerminalAction` so the call site can use it for the splash upload (currently it's a private function)

### Behavior
- Only applies splash on new reader registration (not retroactively)
- Does NOT overwrite if a splash is already active on that terminal location
- Fire-and-forget — registration completes immediately, splash uploads in background
- If splash generation fails (e.g., no org logo), silently skips — no error shown

### Files changed
- `src/hooks/useStripeTerminals.ts` — Export `invokeTerminalAction`
- Registration UI component (Fleet tab) — Add post-registration splash logic (~15 lines)

