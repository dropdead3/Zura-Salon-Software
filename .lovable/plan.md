

# Speed Up Client Directory Edits

## Problem
After saving a client edit (e.g. name change), the system calls `invalidateQueries` which triggers a full refetch of **all clients** in batches of 1000 rows. For large directories, this is slow and causes a noticeable delay before the UI reflects the change.

The `onClientUpdated` callback we added earlier updates `selectedClient` state instantly, but the **list behind the sheet** still waits for the full refetch to complete.

## Solution

Use **optimistic cache updates** on the `client-directory` query data. Instead of just invalidating (which triggers a network refetch), directly patch the matching record in the cached array. Then do a background refetch to stay in sync.

## Changes

### File: `src/components/dashboard/ClientDetailSheet.tsx`

**Replace `invalidateClients` with an optimistic updater:**

```typescript
const updateClientCache = (updates: Record<string, any>) => {
  // Optimistically patch the client in all client-directory caches
  queryClient.setQueriesData(
    { queryKey: ['client-directory'] },
    (old: any[] | undefined) => {
      if (!old || !client) return old;
      return old.map(c => c.id === client.id ? { ...c, ...updates } : c);
    }
  );
  // Background refetch for consistency (non-blocking)
  queryClient.invalidateQueries({ queryKey: ['client-directory'] });
  queryClient.invalidateQueries({ queryKey: ['phorest-clients'] });
};
```

Then in each mutation's `onSuccess`, replace `invalidateClients()` with `updateClientCache(updatedFields)`, passing the same fields already sent to `onClientUpdated`. This makes the list update instantly while the background refetch ensures long-term consistency.

### Mutations affected (all in ClientDetailSheet.tsx):
- `saveMutation` -- name, gender, email, phone, landline
- `saveDatesMutation` -- birthday, client_since
- `saveSourceMutation` -- lead_source, referred_by
- `saveSettingsMutation` -- category, preferred_stylist_id, etc.
- `savePromptsMutation` -- prompts/notes
- `saveAddressMutation` -- address fields
- `saveRemindersMutation` -- reminder preferences

Each will call `updateClientCache({...fields})` instead of `invalidateClients()`.

### No other files change
The `onClientUpdated` callback for the sheet's local state continues to work as-is. This change targets the **list** cache specifically.
