

## Replace Cha-Ching Drawer with Apple-Style Notification Stack

**Problem**: The current implementation uses a Sheet drawer to show cha-ching history. The user wants Apple Notification Center-style behavior — individual glass cards that stack vertically on the right edge, expandable/collapsible, not a drawer.

### Approach

Replace the `ChaChingDrawer` (Sheet-based) with a `ChaChingNotificationCenter` — a fixed overlay panel on the right side that shows stacked glass bento notification cards, Apple-style.

### 1. Replace `ChaChingDrawer.tsx` with `ChaChingNotificationCenter.tsx`

**Delete the Sheet-based drawer. Create new component:**

- **Sticky tab** (keep): Fixed right-edge tab with `DollarSign` icon + unread badge. Clicking toggles the notification stack open/closed.
- **Notification stack**: A fixed-position panel (`fixed right-4 top-20 z-50 w-[340px]`) that renders notification cards stacked vertically with `space-y-2`, newest on top.
- Each card is a `SilverShineWrapper` glass bento card (`bg-card/80 backdrop-blur-xl rounded-xl border-border/40`) — same styling as the toast.
- Cards show: icon, amount, relative time, dismiss (X) button on hover.
- **Grouped summary**: When more than 3 notifications exist, collapse older ones into a summary card ("+ N more checkouts") that expands on click — like Apple groups notifications.
- **Clear all** button at bottom when expanded.
- **Click outside** or tab button again to collapse.
- Animate cards in with `framer-motion` (`AnimatePresence` + slide-in from right).

### 2. Update `useChaChingHistory.tsx`

- Add `dismissNotification(id: string)` to remove individual items.
- Add `clearAll()` to remove everything.

### 3. Update `DashboardLayout.tsx`

- Replace `ChaChingDrawer` import/render with `ChaChingNotificationCenter`.

### 4. Keep `ChaChingToast.tsx` unchanged

- The sonner toast still fires on new checkouts (the ephemeral popup). The notification center is the persistent history view — they complement each other.

### Files
- **Rewrite**: `src/components/dashboard/ChaChingDrawer.tsx` → `src/components/dashboard/ChaChingNotificationCenter.tsx`
- **Edit**: `src/hooks/useChaChingHistory.tsx` — add `dismissNotification`, `clearAll`
- **Edit**: `src/components/dashboard/DashboardLayout.tsx` — swap component import

