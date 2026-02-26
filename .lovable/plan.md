

## Simplify Cha-Ching to Toast-Only

The `ChaChingToast` (sonner toast) already fires on every checkout via `useChaChingDetector`. The notification center, sticky tab, and history are unnecessary overhead. Strip them out.

### Changes

1. **Delete `src/components/dashboard/ChaChingNotificationCenter.tsx`** — remove the entire component (sticky tab + notification stack panel).

2. **Edit `src/components/dashboard/DashboardLayout.tsx`**
   - Remove `ChaChingNotificationCenter` import and `<ChaChingNotificationCenter />` render (line 1345).
   - Keep `ChaChingDetectorMount` and `ChaChingHistoryProvider` (the detector fires the toast).

3. **Edit `src/hooks/useChaChingDetector.tsx`**
   - Change toast `duration` from `5000` to `3000` (3-second auto-dismiss).

4. **No changes to `ChaChingToast.tsx`** — it already has the right glass bento styling and auto-dismisses with the sonner toast lifecycle.

