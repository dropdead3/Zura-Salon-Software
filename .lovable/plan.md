

## Visual Separation Between Cards and Bottom Nav + Smoother Nav Animations

**Problem:** The last appointment card sits too close to the bottom navigation dock, making the UI feel crowded. Additionally, the bottom nav tab transitions lack smooth, polished animations when switching between tabs.

### Changes

#### 1. Increase bottom scroll padding — `src/components/dock/schedule/DockScheduleTab.tsx`

Line 226: The scroll container already has `pb-44`. Increase to `pb-56` to push the last card further above the bottom nav, ensuring clear separation even when scrolled to the end.

#### 2. Smoother bottom nav animations — `src/components/dock/DockBottomNav.tsx`

- **Icon transitions:** Replace the abrupt `scale` animation with a combined scale + opacity shift. Icons that become inactive should fade slightly before settling, and active icons should scale up with a subtle y-translate (lift effect):
  ```
  animate={{ scale: isActive ? 1.15 : 0.95, y: isActive ? -2 : 0 }}
  ```

- **Label animation:** Currently uses simple opacity (0 → 1). Add a subtle y-translate for a slide-up-fade-in feel:
  ```
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 4 }}
  transition={{ duration: 0.2 }}
  ```

- **Inactive icon color transition:** The current `transition-colors duration-150` is fine but bump to `duration-200` for smoother color fade.

- **Pill indicator:** Already uses `layoutId` with spring physics — this is solid. No change needed.

#### 3. Increase gradient fade height — `src/components/dock/DockLayout.tsx`

Line 104: The gradient overlay `h-44` could be increased to `h-52` to extend the fade zone, providing a more gradual transition from content to nav area.

### Summary

| File | Change |
|------|--------|
| `DockScheduleTab.tsx` | `pb-44` → `pb-56` for more bottom clearance |
| `DockBottomNav.tsx` | Add y-translate to icon/label animations, extend color transition duration |
| `DockLayout.tsx` | `h-44` → `h-52` for larger gradient fade |

Three files, class-level and animation prop adjustments only. No logic changes.

