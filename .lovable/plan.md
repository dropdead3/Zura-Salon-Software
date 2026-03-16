

# Invalidate Entitlements Query After Setup Link Sent

Add `queryClient.invalidateQueries({ queryKey: ['platform-backroom-entitlements'] })` to the `onSuccess` callback in `useSendPaymentSetupLink` so the tooltip timestamp updates immediately.

### File: `src/hooks/platform/useSendPaymentSetupLink.ts`

- Import `useQueryClient` from `@tanstack/react-query`
- Get `queryClient` inside the hook
- Add `queryClient.invalidateQueries({ queryKey: ['platform-backroom-entitlements'] })` in `onSuccess`

