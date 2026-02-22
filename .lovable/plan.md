

# Gap Analysis and Fixes -- Assistant Time Block System (Post Phase 5)

## Summary

After auditing all assistant time block files, I found 1 critical error, 3 data/config gaps, 2 UX issues, and 3 enhancement opportunities.

---

## CRITICAL: Edge Function Not Registered in config.toml

**File**: `supabase/config.toml`

**Problem**: The `notify-assistant-block` edge function exists at `supabase/functions/notify-assistant-block/index.ts` but is NOT registered in `config.toml` with `verify_jwt = false`. Every call from `supabase.functions.invoke('notify-assistant-block', ...)` in `useAssistantTimeBlocks.ts` and `AssistantBlockActions.tsx` will fail silently (JWT verification error) because the client invokes it with the anon key, not a service role key.

**Fix**: Add `[functions.notify-assistant-block]` with `verify_jwt = false` to `supabase/config.toml`.

---

## Gap 1: Console Error -- AlertDialog Ref Warning

**File**: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

**Problem**: The console shows "Function components cannot be given refs" pointing to `AlertDialog` inside `AppointmentDetailSheet`. The `AlertDialog` components at lines 1265 and 1299 are rendered inside a `createPortal(...)` call. When `AlertDialog` (a Radix primitive) is used as a direct child of a portal fragment, React attempts to attach a ref to it, which fails because `AlertDialog` is not wrapped with `forwardRef`.

**Fix**: Wrap each `AlertDialog` in a `<div>` fragment or use `AlertDialog` at the component root level instead of inside the portal's JSX fragment. This is a cosmetic warning but creates console noise.

---

## Gap 2: `send-push-notification` Not in config.toml

**File**: `supabase/config.toml`

**Problem**: The `notify-assistant-block` edge function calls `send-push-notification` internally via `fetch()`. If `send-push-notification` is also not in config.toml, the internal call will also fail. Need to verify and add if missing.

**Fix**: Verify `send-push-notification` is registered in config.toml. If not, add it.

---

## Gap 3: `useAssistantAutoSuggest` Missing `assistantUserId` Dependency

**File**: `src/components/dashboard/schedule/RequestAssistantPanel.tsx`

**Problem**: The `useEffect` at line 123-127 has `assistantUserId` in its closure but not in the dependency array. The effect runs when `topSuggestion` or `suggestions.length` changes, but the condition `!assistantUserId` reads a stale value after the user manually selects someone. This could cause the auto-suggestion to re-override a manual selection if the suggestions list changes.

**Fix**: This is minor since `topSuggestion.user_id` is stable, but the correct fix is to track whether the user has ever manually selected (a `hasManuallySelected` ref) and skip auto-select if true.

---

## Gap 4: Notification Item Missing Block Status Check

**File**: `src/components/dashboard/schedule/AssistantBlockNotificationItem.tsx`

**Problem**: The Accept/Decline buttons render based on `showActions` (checks `requestingUserId !== currentUserId`), but there is no check for whether the block has already been confirmed or declined. If the block was already accepted by someone else, clicking Accept would still work but would overwrite the existing assistant.

**Fix**: Fetch the current block status before rendering actions, or pass `block_status` in the notification metadata and only show actions when `status === 'requested'`.

---

## Gap 5: Utilization Stats Missing Organization Scoping on Profiles Query

**File**: `src/hooks/useAssistantUtilizationStats.ts`

**Problem**: The profiles query at line 63 fetches ALL `employee_profiles` without filtering by `organization_id`. In a multi-tenant system this is wasteful and could expose cross-org names if the query ever returned to a shared context.

**Fix**: Add `.eq('organization_id', organizationId)` to the profiles query.

---

## Enhancement 1: Auto-Suggest Algorithm -- Exclude Self from Pool Notifications

**File**: `src/hooks/useAssistantAutoSuggest.ts`

**Problem**: The algorithm correctly filters out `requestingUserId` at line 91, but the `useAssistantsAtLocation` hook doesn't filter by role. This means non-assistant employees (e.g., stylists, managers) could appear in the suggestion list.

**Enhancement**: Filter `availableAssistants` to only include users who have the `stylist_assistant` or `assistant` role, matching the pool notification logic.

---

## Enhancement 2: Resize Does Not Check Conflicts

**File**: `src/components/dashboard/schedule/AssistantBlockOverlay.tsx`

**Problem**: When a block is resized, `onBlockResize` fires immediately without checking if the new end time creates a conflict with an existing appointment or time block. The plan noted this as a gap analysis item but it was not addressed.

**Enhancement**: After resize, validate the new time range against `useAssistantConflictCheck` before committing. If conflicting, show a toast warning and revert.

---

## Enhancement 3: Manager Sheet -- Add Organization ID Filter

**File**: `src/components/dashboard/schedule/AssistantBlockManagerSheet.tsx`

**Problem**: The "All" tab shows all blocks at the location without `organization_id` filtering. While the location itself is org-scoped via RLS, adding an explicit org filter would be defense-in-depth.

**Enhancement**: Pass `organizationId` to `useAssistantTimeBlocksRange` and add `.eq('organization_id', orgId)` to the query.

---

## Technical Details

### Files to Modify

| File | Change | Priority |
|---|---|---|
| `supabase/config.toml` | Add `[functions.notify-assistant-block]` with `verify_jwt = false` | Critical |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Wrap AlertDialog instances to fix ref warning | Medium |
| `src/components/dashboard/schedule/RequestAssistantPanel.tsx` | Add `hasManuallySelected` ref to prevent auto-select override | Low |
| `src/components/dashboard/schedule/AssistantBlockNotificationItem.tsx` | Add block status metadata check before showing action buttons | Medium |
| `src/hooks/useAssistantUtilizationStats.ts` | Add org scoping to profiles query | Medium |
| `src/hooks/useAssistantAutoSuggest.ts` | Filter suggestions to assistant-role users only | Low |
| `src/components/dashboard/schedule/AssistantBlockOverlay.tsx` | Add conflict check on resize completion | Low |
| `src/components/dashboard/schedule/AssistantBlockManagerSheet.tsx` | Add org ID to range query | Low |

