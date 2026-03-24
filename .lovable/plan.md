

## Fix: Allergy & Booking Notes Banners Not Appearing on Services/Formulations Tab

### Investigation

The `DockClientAlertsBanner` is rendered at the top of `DockServicesTab`. For Rachel Kim (`client_id: 'demo-client-7'`), the demo mock returns allergy data (`PPD sensitivity`) and her appointment has booking notes (`Keep it natural — level 7 base`). Both should show.

### Root cause

The dismissed state is initialized from `sessionStorage` in `useState`. The key is `dock-alerts-dismissed-demo-client-7`. While the logout handler clears keys matching `dock-alerts-dismissed-demo-*`, there's a timing issue: if the user dismissed banners, navigated away, then came back WITHOUT logging out, the sessionStorage value persists and banners stay hidden. The user may also be hitting a scenario where the cleanup runs but the component's initial state already read the stale value.

### Fix — two-part

**1. `src/components/dock/appointment/DockClientAlertsBanner.tsx`**
- Add a `useEffect` that re-reads sessionStorage when the `storageKey` changes (i.e., when navigating to a different appointment). Currently the `useState` initializer only runs on first mount — if the component stays mounted while the key changes, stale dismissed state from the previous client carries over.
- Also ensure the `dock-demo-reset` listener clears the sessionStorage entry too, not just the React state.

**2. `src/components/dock/appointment/DockClientAlertsBanner.tsx`** — Reset dismissed on key change
```ts
// When storageKey changes (different client), re-read from sessionStorage
useEffect(() => {
  try {
    const stored = sessionStorage.getItem(storageKey);
    setDismissed(stored ? new Set(JSON.parse(stored) as BannerKey[]) : new Set());
  } catch {
    setDismissed(new Set());
  }
}, [storageKey]);
```

And update the reset listener to also clear sessionStorage:
```ts
useEffect(() => {
  const handleReset = () => {
    setDismissed(new Set());
    try { sessionStorage.removeItem(storageKey); } catch {}
  };
  window.addEventListener('dock-demo-reset', handleReset);
  return () => window.removeEventListener('dock-demo-reset', handleReset);
}, [storageKey]);
```

### Result
Banners reliably appear for every demo appointment on first view, survive navigation between appointments, and reset properly on logout.

### One file changed
`src/components/dock/appointment/DockClientAlertsBanner.tsx`

