

## Replace Bottom Navigation Bar with Top Hamburger Menu

**What the user wants:** Remove the entire bottom floating navigation bar (DockBottomNav) and its associated gradient, and move all tab navigation options into a hamburger menu at the top of the screen.

### Current bottom nav tabs
- Schedule, Active, Clients, Scale, Settings (morphs to Lock Station when active)

### Changes

#### 1. `src/components/dock/DockLayout.tsx`
- **Remove** the `DockBottomNav` render block and the bottom gradient overlay (lines 97-105)
- **Add** a top bar with hamburger menu icon that opens a slide-down or popover menu containing all 5 tab options + Lock Station
- Use `absolute` positioning and dock tokens for containment
- Menu items styled with dock platform tokens, active tab highlighted with violet indicator
- Lock Station as a separate destructive-styled item at the bottom of the menu

#### 2. `src/components/dock/schedule/DockScheduleTab.tsx`
- Remove the bottom blur/fade overlay from the scroll container (keep top fade only)
- Reduce bottom padding from `pb-56` to `pb-8` since no bottom nav to clear

#### 3. New: `src/components/dock/DockHamburgerMenu.tsx`
- Receives `activeTab`, `onTabChange`, `onLockStation` props (same as DockBottomNav)
- Hamburger icon button (top-right or top-left) using `Menu` / `X` icons
- Opens an overlay menu (`absolute inset-0 z-40`) with backdrop blur
- Lists all 5 tabs with icons, highlights active tab in violet
- Lock Station at bottom in red/destructive style
- Uses framer-motion spring transitions per dock UI standards
- Tapping a tab changes it and closes the menu

#### 4. `src/components/dock/DockBottomNav.tsx`
- Keep file for now (no deletion needed), just stop importing/rendering it in DockLayout

### Summary

| File | Change |
|------|--------|
| `DockLayout.tsx` | Remove bottom nav + gradient, add hamburger menu component |
| `DockHamburgerMenu.tsx` | New — full-screen overlay menu with all tabs + lock |
| `DockScheduleTab.tsx` | Remove bottom fade overlay, reduce bottom padding |

