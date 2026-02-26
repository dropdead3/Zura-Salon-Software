

## Redesign: Split Sound Settings from Checkout Notification Settings

You're absolutely right. The cha-ching feature is a **notification** (visual toast + sound + history), not just a sound effect. Grouping it under "Sounds" undersells what the toggle controls and confuses the mental model. Here's the plan:

### Approach

Split the current "Sounds" card into two distinct cards:

1. **Sounds** -- stays as-is, but only controls the general notification sound toggle and preview buttons. Pure audio preferences.
2. **Checkout Alerts** (new card, owner/super-admin only) -- controls the cha-ching toast + sound system. Framed as a notification preference, not a sound preference.

### File: `src/components/dashboard/settings/SoundSettingsSection.tsx`

- Remove the `chaChingEnabled` toggle and the `useEmployeeProfile` import from this component
- Keep only: "Enable notification sounds" toggle + preview buttons
- Keep the card title as "Sounds"

### New File: `src/components/dashboard/settings/CheckoutAlertsSection.tsx`

- New card with `Bell` icon, titled "CHECKOUT ALERTS"
- Description: "Get notified when a client checks out."
- Single toggle: "Cha-ching notifications" / "Show a toast and play a sound when revenue comes in."
- Entire card only renders if `is_primary_owner || is_super_admin`
- Uses `useSoundSettings` for `chaChingEnabled` / `setChaChingEnabled`

### File: `src/pages/dashboard/admin/Settings.tsx`

- Import `CheckoutAlertsSection`
- Render it adjacent to `SoundSettingsSection` (line ~1344)

### Result

- **Sounds** card: audio preferences for all users
- **Checkout Alerts** card: notification preference for owners/admins only, clearly framed as a visual + audio alert system

