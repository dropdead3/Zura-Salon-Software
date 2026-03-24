

## Add Lock FAB + 5-Minute Auto-Lock Timer

### What

1. **Lock FAB** — A floating action button with a Lock icon, visible on every page/tab except the PIN entry screen. Tapping it locks the dock (same as `onLogout`).
2. **Auto-lock timer** — 5-minute idle timeout. Resets on any touch/pointer event or scale activity. When elapsed, auto-locks back to PIN screen.

### Changes

#### 1. New hook: `src/hooks/dock/useDockIdleTimer.ts`

- Accepts `onIdle` callback and `timeout` (default 300000ms = 5min)
- Listens for `touchstart`, `pointerdown`, `pointermove`, `keydown` on the container element
- Resets a `setTimeout` on each interaction
- Returns a `containerRef` to attach to the root element
- When timeout fires, calls `onIdle()` (which triggers lock/logout)

#### 2. New component: `src/components/dock/DockLockFAB.tsx`

- Circular button, bottom-left corner (`fixed bottom-6 left-6` or `absolute` within dock container)
- Lock icon, semi-transparent dark background matching platform theme
- `onClick` → calls `onLock` prop
- Styled to not conflict with hamburger menu (top-right) or scroll content

#### 3. `src/components/dock/DockLayout.tsx`

- Import and render `DockLockFAB` on all screens (including appointment detail)
- Import and use `useDockIdleTimer` hook, passing `onLogout` as the idle callback
- Attach idle timer ref to the dock container div
- Remove the old lock gesture affordance (small Lock icon bottom-right) since the FAB replaces it
- Keep the `useDockLockGesture` swipe-to-lock as a secondary mechanism

### FAB styling
- `absolute bottom-6 left-6 z-30`
- `w-12 h-12 rounded-full`
- `bg-[hsl(var(--platform-foreground)/0.08)] border border-[hsl(var(--platform-border)/0.2)]`
- Lock icon `w-5 h-5 text-[hsl(var(--platform-foreground-muted))]`
- Subtle hover/press feedback

### Auto-lock details
- Events that reset timer: `touchstart`, `pointerdown`, `pointermove`, `keydown`
- Timer: 5 minutes (300,000ms)
- Fires `onLogout` which triggers the existing lock animation flow

### Summary

| File | Change |
|------|--------|
| `useDockIdleTimer.ts` | New hook — idle timeout with touch/pointer reset |
| `DockLockFAB.tsx` | New component — lock floating action button |
| `DockLayout.tsx` | Add FAB + idle timer, remove old lock affordance icon |

3 files total.

