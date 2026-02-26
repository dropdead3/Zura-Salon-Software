

## Enhance Cha-Ching Notifications: Glass Bento + History Drawer

### Current state
Cha-ching fires a plain `sonner` toast with text "💰 Cha-ching!" and a description. No history, no custom styling, stacks poorly (as shown in screenshot).

### Plan

#### 1. Create a cha-ching notification store
**New file**: `src/hooks/useChaChingHistory.ts`
- React context + provider with state: `notifications: Array<{ id, amount, timestamp }>` (max 50, session-only).
- `addNotification(amount)` pushes to array.
- `unreadCount` derived from items added since last drawer open.
- `markAllRead()` resets unread count.
- Export `useChaChingHistory` hook.

#### 2. Create custom cha-ching toast component
**New file**: `src/components/dashboard/ChaChingToast.tsx`
- Glass bento card: `bg-card/80 backdrop-blur-xl border border-border/40 rounded-xl shadow-2xl`.
- Wrapped in `SilverShineWrapper` for the silver shine stroke effect.
- Layout: money bag icon left, "Cha-ching!" title (font-display), amount below (font-display text-xl tabular-nums), timestamp in muted text.
- Renders via `toast.custom()` from sonner instead of `toast()`.
- Auto-dismiss after 5s with smooth exit animation.

#### 3. Create sticky cha-ching tab + drawer
**New file**: `src/components/dashboard/ChaChingDrawer.tsx`
- **Sticky tab**: Fixed to right edge of screen, vertically centered. Small pill/tab shape (`rounded-l-xl`) with money bag icon + unread count badge. Uses `bg-card/80 backdrop-blur-xl border-border/40`.
- **On click**: Opens a right-side sheet/drawer (using Vaul or Radix Dialog) listing all session notifications in reverse chronological order.
- Each history item: glass bento mini-card with amount, relative timestamp ("2m ago"), silver shine border.
- Empty state if no notifications yet.
- "Mark all read" clears the badge count.

#### 4. Wire into existing cha-ching trigger
**File**: `src/hooks/useTodayActualRevenue.ts`
- Replace `toast('💰 Cha-ching!', ...)` with:
  - `addNotification(delta)` to push to history store.
  - `toast.custom((t) => <ChaChingToast amount={delta} toastId={t} />)` for the styled notification.
- Keep `playAchievement()` call unchanged.

#### 5. Mount providers and components
**File**: `src/App.tsx` (or layout wrapper)
- Wrap with `ChaChingHistoryProvider`.
- Render `ChaChingDrawer` inside the dashboard layout so the sticky tab appears on all dashboard pages.

### Files
- **New**: `src/hooks/useChaChingHistory.tsx` — notification store + context
- **New**: `src/components/dashboard/ChaChingToast.tsx` — custom glass bento toast
- **New**: `src/components/dashboard/ChaChingDrawer.tsx` — sticky tab + history drawer
- **Edit**: `src/hooks/useTodayActualRevenue.ts` — swap plain toast for custom toast + history push
- **Edit**: Dashboard layout — mount provider + drawer

