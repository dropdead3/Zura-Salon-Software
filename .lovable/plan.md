

## Fix: Alerts & Notes Not Showing After Demo Re-login

### Root cause
When you log out of the Dock (lock icon), `handleLogout` in `Dock.tsx` resets the staff session but does NOT clear demo sessionStorage or dispatch `dock-demo-reset`. So dismissed alerts and added notes from the previous session remain in `sessionStorage`, and the alert banner still thinks they were dismissed.

### Fix — `src/pages/Dock.tsx`

In `handleLogout`, add demo cleanup before resetting staff:

```ts
const handleLogout = useCallback(() => {
  // Clear demo sessionStorage on logout
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('dock-demo-') || key?.startsWith('dock-alerts-dismissed-demo-')) {
      sessionStorage.removeItem(key);
    }
  }
  window.dispatchEvent(new Event('dock-demo-reset'));

  setUnlocked(false);
  setActiveTab('schedule');
  setView({ screen: 'tabs' });
  setTimeout(() => setStaff(null), 500);
}, []);
```

This reuses the exact same cleanup logic as the Reset Demo button, ensuring all demo alerts, notes, bowls, and medical alerts reset when logging out and back in.

### One file changed
`src/pages/Dock.tsx` — add 7 lines to `handleLogout`

