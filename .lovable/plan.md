

# Fix: Auto-Create Terminal Location & Remove Manual Button

## The Problem

You're absolutely right — this is a redundant and confusing UX. The flow currently is:

1. Select "North Mesa" from the location picker ✅
2. Zura Pay connects to that location ✅
3. Then you're asked to manually "Create Location" **again** — but this time it's creating a **Stripe Terminal Location** (`tml_` object) inside Stripe's API
4. There's **no deduplication** — every click creates another identical entry (hence the two "North Mesa" rows in your screenshot)

The operator shouldn't need to know about or manage Stripe's internal terminal location objects. One Zura location = one terminal location. Period.

## Fix Plan

### 1. Auto-create Terminal Location on Zura Pay connection
**File:** `TerminalSettingsContent.tsx`

When a location first connects to Zura Pay (or when the Fleet tab loads and detects a connected location with zero terminal locations), automatically call `createTerminalLocation` once. This eliminates the manual step entirely.

### 2. Remove the "Create Location" button
**File:** `ZuraPayFleetTab.tsx`

Remove the `+ Create Location` button from the Terminal Locations card header. Since one Zura location maps to exactly one Stripe terminal location, there's no reason for the operator to create additional ones.

### 3. Add deduplication guard in the edge function
**File:** `supabase/functions/manage-stripe-terminals/index.ts`

Before creating a new Stripe terminal location, check `list_locations` first. If a terminal location already exists with matching metadata (our `location_id`), return the existing one instead of creating a duplicate. This prevents duplicates even if the auto-create fires twice.

### 4. Clean up the duplicate from the screenshot
Use the Stripe API tools to list and delete the duplicate `tml_` entry for North Mesa, leaving only one.

---

## Summary

| Change | File | Impact |
|--------|------|--------|
| Auto-create terminal location on connect | `TerminalSettingsContent.tsx` | Eliminates manual step |
| Remove "Create Location" button | `ZuraPayFleetTab.tsx` | Cleaner UX |
| Deduplication guard in edge function | `manage-stripe-terminals/index.ts` | Prevents duplicates |
| Delete existing duplicate | Stripe API | Cleans current state |

