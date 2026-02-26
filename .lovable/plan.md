

## Add Preview Button to Checkout Alerts Card

### File: `src/components/dashboard/settings/CheckoutAlertsSection.tsx`

- Import `Button`, `tokens`, `useNotificationSound`, `ChaChingToast`, and `toast` from sonner
- Add a "Preview cha-ching" button below the toggle row
- On click: fire `toast.custom()` with a `ChaChingToast` (using a sample amount like $125.00) and call `playAchievement()`
- Button disabled when `chaChingEnabled` is false
- Uses `tokens.button.card` size, outline variant, consistent with SoundSettingsSection preview buttons

