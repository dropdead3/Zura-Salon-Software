

# Show Duplicate Badge and Merge Button on Both Linked Profiles

## Problem
When searching for a client like "Eric Day," both the duplicate and its canonical (original) profile appear in results. However, only the duplicate record shows the amber "Duplicate (Same Phone)" badge and the prominent "Merge" button. The canonical profile just shows a small ghost merge icon -- making it unclear that these two records are related and mergeable.

## Solution
When a canonical profile is auto-included via the linked-profile expansion logic, treat it visually the same as the duplicate: show the duplicate context badge (with match reasons) and the prominent "Merge" button pre-populated with both IDs.

## Changes (single file: `src/pages/dashboard/ClientDirectory.tsx`)

### 1. Compute duplicate reasons for linked canonical profiles
When a canonical profile is pulled in via `_linkedReason === 'canonical'`, compute the match reasons (Same Phone, Same Email, etc.) by comparing it against the duplicate that triggered its inclusion. Currently `duplicateReasons` is only computed for records where `is_duplicate === true`.

### 2. Show the duplicate badge on linked canonical profiles
Update the badge rendering (around line 839) so that profiles with `_linkedReason === 'canonical'` also display an amber-styled badge showing the match reason, e.g., "Linked (Same Phone)".

### 3. Show the prominent Merge button on linked canonical profiles
Update the merge button logic (around line 923) so that profiles with `_linkedReason` also get the styled "Merge" button (not the ghost icon). The button will pre-populate the merge wizard with both the canonical and duplicate client IDs.

## Technical Details

- The `_linkedReason` property already identifies auto-included profiles
- For canonical profiles pulled in, we find the duplicate that triggered inclusion and compute match reasons from the same phone/email/name comparison logic
- The existing blue "Linked original" badge will be replaced with the amber duplicate-style badge showing actual match reasons
- The merge button for linked canonicals will include both IDs in the URL params, same as the duplicate's merge button
