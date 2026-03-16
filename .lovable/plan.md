

# Move Invalidation to `onSettled` for Defensive Coverage

Move the `queryClient.invalidateQueries` call from `onSuccess` to `onSettled` in `useSendPaymentSetupLink`, so the entitlements query is refetched after both success and error paths — covering edge cases where the server partially updated before erroring.

### File: `src/hooks/platform/useSendPaymentSetupLink.ts`

- Remove `queryClient.invalidateQueries(...)` from `onSuccess`
- Add an `onSettled` callback that calls `queryClient.invalidateQueries({ queryKey: ['platform-backroom-entitlements'] })`

