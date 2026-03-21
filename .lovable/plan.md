

## Fix Dock Kebab Menu Styling

### Problem
The `PopoverContent` renders via a Radix **Portal** (appended to `document.body`), which sits outside the `.platform-theme` container. The `--platform-*` CSS variables don't resolve there, so the menu falls back to light/default semantic styles despite having the correct class names.

### Fix
Replace the Radix `Popover` in `DockAppointmentCard` with a simple **inline absolute-positioned dropdown** — no portal needed. This keeps the menu inside the `.platform-theme` DOM tree where all `--platform-*` variables resolve correctly.

### Changes

**File: `src/components/dock/schedule/DockAppointmentCard.tsx`**

1. Remove `Popover`, `PopoverContent`, `PopoverTrigger` imports
2. Replace with a simple `{menuOpen && <div>}` dropdown using:
   - `absolute right-0 top-full mt-1 z-50` positioning (anchored to the kebab button wrapper)
   - Same dark styling already in the code: `bg-[hsl(var(--platform-bg-elevated))]`, `border-[hsl(var(--platform-border)/0.3)]`, `rounded-xl`, `shadow-xl`
   - Click-outside dismiss via a transparent backdrop overlay
3. Make the kebab button's parent `relative` for anchor positioning

No other files change. The styling classes stay identical — they just now resolve correctly because they're inside the platform theme scope.

