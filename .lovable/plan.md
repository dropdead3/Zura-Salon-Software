
# Fix: Client Detail Sheet Not Reflecting Saved Changes

## Problem
The data IS saving to the database (confirmed). The issue is a stale state problem:

1. When you click a client row, `selectedClient` is set to a **snapshot copy** of the client (`{ ...client }`)
2. After editing and saving, the mutation succeeds and invalidates the query cache
3. The parent's client list refetches with updated data
4. But `selectedClient` state still holds the **old snapshot** -- it never gets updated
5. So the sheet keeps displaying the pre-edit values even though the database has the new ones

## Solution

**File: `src/components/dashboard/ClientDetailSheet.tsx`**

Update the `onSuccess` callback of `saveMutation` to also update the displayed values by calling `startEditing`-like logic in reverse -- or more cleanly, use `queryClient.invalidateQueries` and then update the client prop from the parent.

The cleanest fix: In the `onSuccess` of each save mutation, pass back the updated fields so the parent can refresh `selectedClient`. We'll do this by:

1. Having `ClientDetailSheet` accept an optional `onClientUpdated` callback prop
2. In `ClientDirectory.tsx`, pass an `onClientUpdated` handler that updates `selectedClient` with the new values
3. Call `onClientUpdated` from each mutation's `onSuccess`

### Changes

**`src/components/dashboard/ClientDetailSheet.tsx`**:
- Add `onClientUpdated?: (updates: Partial<Client>) => void` to the props interface
- In `saveMutation.onSuccess`, call `onClientUpdated` with the edited fields
- Apply the same pattern for `saveDatesMutation`, `saveSourceMutation`, `saveSettingsMutation`, etc.

**`src/pages/dashboard/ClientDirectory.tsx`**:
- Add an `onClientUpdated` handler that merges updates into `selectedClient`
- Pass it to `ClientDetailSheet`

This ensures the sheet immediately reflects saved changes without needing to close and reopen.
