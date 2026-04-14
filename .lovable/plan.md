

# Remove Redundant Header Buttons When No Readers Exist

## Problem
When no readers are paired, the card header shows a Refresh button and "Register Reader" button that duplicate the empty state CTA buttons below. This is redundant.

## Change

**File:** `ZuraPayFleetTab.tsx` (lines ~558-574)

Conditionally hide the Refresh and "Register Reader" buttons in the CardHeader when `readers.length === 0`. The empty state already provides both "Order Hardware" and "Register Reader" buttons, so the header actions are only useful when readers exist.

Wrap the header button group in a condition: only render when `readers && readers.length > 0`.

