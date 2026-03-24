

## Persist Demo Bowls in sessionStorage

### Problem
Demo bowls are stored in React `useState`, so they vanish whenever the user navigates away from an appointment and returns. For training purposes, bowls need to survive within the browser session.

### Solution
Replace the `useState<DemoBowl[]>([])` with a `sessionStorage`-backed state, keyed per appointment. On create, write to both state and `sessionStorage`. On mount, hydrate from `sessionStorage`. On demo reset, clear the relevant keys.

### Changes — `src/components/dock/appointment/DockServicesTab.tsx`

1. **Storage key**: `dock-demo-bowls::${appointment.id}`
2. **Initialize state** from `sessionStorage` instead of empty array:
   ```ts
   const storageKey = `dock-demo-bowls::${appointment.id}`;
   const [demoBowls, setDemoBowls] = useState<DemoBowl[]>(() => {
     try {
       const stored = sessionStorage.getItem(storageKey);
       return stored ? JSON.parse(stored) : [];
     } catch { return []; }
   });
   ```
3. **Sync to storage** on every change:
   ```ts
   useEffect(() => {
     sessionStorage.setItem(storageKey, JSON.stringify(demoBowls));
   }, [demoBowls, storageKey]);
   ```
4. **Demo reset handler** — also clear sessionStorage:
   ```ts
   const handleReset = () => {
     setDemoBowls([]);
     // Clear all demo bowl keys
     for (let i = sessionStorage.length - 1; i >= 0; i--) {
       const key = sessionStorage.key(i);
       if (key?.startsWith('dock-demo-bowls::')) sessionStorage.removeItem(key);
     }
   };
   ```

One file, minimal change. Bowls persist across navigation within the session and clear on demo reset or tab close.

