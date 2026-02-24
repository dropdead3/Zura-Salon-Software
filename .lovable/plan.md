
## Move "View in Client Directory" to Ellipsis Menu

### Change

In `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`:

1. **Remove** the "View in Client Directory" button from the Client Contact section (lines 1195-1206).

2. **Add** a "View in Client Directory" menu item to the existing ellipsis (three-dots) `DropdownMenuContent` (around line 809), conditionally rendered when `resolvedClientId` is truthy. It will use the `ExternalLink` icon and navigate via `handleClose()` + `navigate(...)`, same as current behavior.

3. **Adjust ellipsis menu visibility**: The dropdown is currently gated by `canDelete || (isManagerOrAdmin && appointment.status === 'confirmed')`. Since "View in Client Directory" should be available to all users with a linked client, the gate condition will be expanded to also show when `resolvedClientId` is truthy:
   ```
   {(canDelete || (isManagerOrAdmin && ...) || !!resolvedClientId) && (
   ```

### Result
- The Client Contact section will only show phone/email -- cleaner layout
- The ellipsis menu gains a navigation item available to all users when the client is linked
- Delete and Revert actions remain permission-gated within the menu
