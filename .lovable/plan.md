

## Redesign Settings Tab: "Move Zura Dock" Module + Confirmation Dialog

### What changes

**`src/components/dock/settings/DockSettingsTab.tsx`**

1. **Accept `locationId` and `organizationId` props** from the parent `DockLayout` (already available on `staff`).

2. **Add a location query** using `useLocations(organizationId)` to resolve the current location name from `staff.locationId`.

3. **Replace "Reset Device Binding" button** with a "Move Zura Dock to Another Location" module card:
   - Card with `MapPin` icon, title "Station Location", and subtitle showing the current bound location name (e.g. "North Mesa")
   - A "Move to Another Location" button below styled as a secondary action
   - Descriptive helper text: "Reassign this device to a different salon location. The station will log out and rebind on next login."

4. **Add an AlertDialog confirmation** (using existing `PlatformAlertDialogContent` wrappers):
   - Title: "Move Zura Dock?"
   - Description: "This will unbind this device from **{locationName}**. On next PIN login, it will bind to the new staff member's location."
   - Cancel + Confirm ("Move Station") buttons
   - On confirm: clear localStorage keys, toast, and logout (same logic as before)

5. **Pass `staff.locationId` to the settings tab** — already available since `DockSettingsTab` receives the full `staff` object which includes `locationId` and `organizationId`.

### Technical detail

- Import `useLocations` from `@/hooks/useLocations`
- Import `AlertDialog`, `PlatformAlertDialogContent`, `PlatformAlertDialogTitle`, `PlatformAlertDialogDescription`, `PlatformAlertDialogCancel`, `AlertDialogAction`, `AlertDialogFooter` from `@/components/platform/ui/PlatformDialog`
- Import `MapPin` from lucide
- Single file change, no schema changes

