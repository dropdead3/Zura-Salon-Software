

## Add Session Persistence to Banner Dismissals

### Problem
Dismissed alert banners reset when navigating between tabs or re-entering the appointment, because the `dismissed` state is local `useState` — lost on unmount.

### Approach
Use `sessionStorage` keyed per appointment to persist which banners have been dismissed. On mount, read from sessionStorage; on dismiss, write to it. Banners stay dismissed for that appointment until the browser tab is closed.

### Change — `src/components/dock/appointment/DockClientAlertsBanner.tsx`

**Storage key**: `dock-alerts-dismissed-{clientId || phorestClientId}` — stores a JSON array of dismissed banner keys (e.g. `["allergy","booking"]`).

**Init state from sessionStorage**:
```ts
const storageKey = `dock-alerts-dismissed-${clientId || phorestClientId}`;

const [dismissed, setDismissed] = useState<Set<BannerKey>>(() => {
  try {
    const stored = sessionStorage.getItem(storageKey);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch { return new Set(); }
});
```

**Update dismiss callback** to also write to sessionStorage:
```ts
const dismiss = useCallback((key: BannerKey) => {
  setDismissed(prev => {
    const next = new Set(prev).add(key);
    try { sessionStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
    return next;
  });
}, [storageKey]);
```

One file, minimal change. Dismissed banners persist across tab switches within the same session.

