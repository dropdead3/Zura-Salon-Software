

## Fix: Demo Formula History Not Appearing

### Root cause
`useClientFormulaHistory` requires `!!orgId` in its `enabled` condition. The `orgId` comes from `useOrganizationContext().effectiveOrganization?.id`. In Dock demo mode, there's no authenticated user, so `effectiveOrganization` is null — the query never fires, even though the `queryFn` has a demo-data shortcut for `demo-` client IDs.

### Fix — `src/hooks/backroom/useClientFormulaHistory.ts`

Update the `enabled` condition to allow demo clients through without requiring `orgId`:

```ts
// Before
enabled: !!orgId && !!clientId,

// After
enabled: (!!orgId || clientId?.startsWith('demo-')) && !!clientId,
```

This lets the query fire for demo clients even when there's no organization context. The `queryFn` already returns `DEMO_FORMULA_HISTORY[clientId]` for demo IDs before touching Supabase.

### Same issue in `useInstantFormulaMemory`
`src/hooks/backroom/useInstantFormulaMemory.ts` has the same pattern — `enabled: !!orgId && !!clientId`. Apply the same fix so formula memory also works in demo mode.

### Files changed
1. `src/hooks/backroom/useClientFormulaHistory.ts` — relax `enabled` for demo clients
2. `src/hooks/backroom/useInstantFormulaMemory.ts` — relax `enabled` for demo clients

