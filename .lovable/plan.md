

## Luxury Notification Badge Enhancement

### What's Changing
Unify all three notification badge locations (sidebar NavBadge, bell icon badge, announcements badge) to use a luxury glass aesthetic: transparent red background with a bright red stroke border and crisp number inside.

### Approach
Update the shared `NavBadge` component with the new luxury style, then update the two inline badge instances (NotificationsPanel bell badge and AnnouncementsDrawer badge) to use the same pattern.

### Style Definition
- Background: `bg-destructive/20` (transparent red glass)
- Border: `border border-destructive` (bright red stroke)
- Text: `text-destructive` (bright red number matching stroke)
- Shape: `rounded-full` (pill)
- Optional subtle glow: `shadow-[0_0_8px_hsl(var(--destructive)/0.3)]`
- Backdrop blur for glass effect on larger badges

### Files
1. **`src/components/dashboard/NavBadge.tsx`** — Update both active and inactive states to use transparent red + bright stroke
2. **`src/components/dashboard/NotificationsPanel.tsx`** (line ~337) — Replace solid `bg-destructive` badge with luxury glass style
3. **`src/components/dashboard/AnnouncementsDrawer.tsx`** (lines ~113, ~144) — Replace solid `bg-red-500` badges with luxury glass style

