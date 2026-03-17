

# Remove Secondary Spinner — Spin the RefreshCw Icon Instead

## Change in `SupplyLibraryTab.tsx` (~line 718-719)

Remove the `loading` prop from the `PlatformButton` and add `animate-spin` to the `RefreshCw` icon when `syncMutation.isPending`:

```tsx
<PlatformButton variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
  <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncMutation.isPending && 'animate-spin')} /> Sync Library
</PlatformButton>
```

This eliminates the double-icon issue (Loader2 + RefreshCw) by just spinning the existing RefreshCw icon during sync.

