

## Add Decorative Star Icons to Sidebar Favorites (No Unpin)

### What Changes

Add non-interactive, decorative star icons back to all three favorite link types in the sidebar. These stars serve as visual indicators that the links are pinned favorites, but they are **not clickable** -- users can only manage favorites from the Analytics Hub pages.

### File to Modify

**`src/components/dashboard/CollapsibleNavGroup.tsx`**

Add a static `<Star>` icon (no button wrapper, no onClick) to three locations:

1. **Category header** (line 295, after the `<span>` for the label):
   ```tsx
   <Star className="w-3 h-3 fill-amber-500 text-amber-500 opacity-50" />
   ```

2. **Overview link** (line 317, after the "Overview" span):
   ```tsx
   <Star className="w-3 h-3 fill-amber-500 text-amber-500 opacity-50" />
   ```

3. **Subtab links** (line 347, after the `{sub.label}` span):
   ```tsx
   <Star className="w-3 h-3 fill-amber-500 text-amber-500 opacity-50" />
   ```

All three use the same styling: filled amber star at 50% opacity. No `<button>` wrapper, no click handler, purely decorative. The `Star` import from `lucide-react` should already be present in the file.

### Result

Each favorited link in the sidebar shows a small amber star confirming it is pinned. The stars are visual-only -- all pin/unpin management happens exclusively on the Analytics Hub pages.

