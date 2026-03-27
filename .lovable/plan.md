

## Add Subtle Bento Active Highlight to Sidebar Nav Links

### Problem
Active navigation links in the sidebar have no visible highlight in the current dark theme. The `dark:bg-muted` active state blends into the sidebar background, making it impossible to tell which page you're on.

### Solution
Replace the current active state styling with a subtle bento-style highlight — a soft, semi-transparent fill with a faint border ring, consistent with the project's glass/bento card aesthetic.

### Changes

**File: `src/components/dashboard/SidebarNavContent.tsx`**

**1. Update the `renderNavLink` active state (line ~305–306)**

Replace:
```
"bg-foreground text-background shadow-sm dark:bg-muted dark:text-foreground dark:shadow-none"
```
With a subtle bento highlight:
```
"bg-muted/80 text-foreground ring-1 ring-border/40 shadow-sm backdrop-blur-sm"
```

This gives:
- Soft background fill (`bg-muted/80`) visible in both light and dark modes
- Gentle border ring (`ring-1 ring-border/40`) for definition without harshness
- Text promoted to `text-foreground` for clarity
- No high-contrast inversion that fights the dark theme

**2. Update the collapsed popover active state (line ~653–654)**

Apply the same bento highlight style to the popover menu's active link for consistency.

**3. Update the onboarding link active state (lines ~439, ~458)**

Apply same pattern to the onboarding nav link active states for visual consistency.

### Result
- Active page link gets a visible but calm bento-style highlight
- Works naturally in both light and dark modes
- Consistent with the project's glass card aesthetic (`bg-card/80`, `backdrop-blur`, `ring-border`)

