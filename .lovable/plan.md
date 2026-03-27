

## Replace Browser `window.confirm` with In-App Dialog

### Problem
The reset action uses `window.confirm()`, which shows an ugly browser-native dialog exposing the raw project URL. This should be an in-app confirmation dialog matching the platform's design language.

### Changes

**`src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

1. **Import `AlertDialog` components** from `@/components/ui/alert-dialog` (`AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction`).

2. **Add state** for the confirmation dialog:
   - `resetConfirmServiceId: string | null` — when non-null, the dialog is open for that service.

3. **Split `handleReset` into two parts**:
   - `confirmReset(serviceId)` — sets `resetConfirmServiceId` to open the dialog.
   - `executeReset()` — contains the actual reset logic (current body minus the `window.confirm` line). Reads from `resetConfirmServiceId`, then clears it after execution.

4. **Update all `handleReset(service.id)` call sites** to use `confirmReset(service.id)` instead.

5. **Add the `AlertDialog` JSX** at the bottom of the component (before the closing fragment), with:
   - Title: "Reset Service Configuration"
   - Description: "This will clear all tracking, billing, and formula configuration for this service. It will return to a 'Needs Attention' state."
   - Cancel button + destructive "Reset" action button

