

# Combine Test & Clear into a Single Dropdown Menu

## Problem
The "Test" and "Clear" buttons sit side-by-side as separate buttons. Users don't understand that "Clear" is specifically to clear the test data from the reader. Grouping them in a single dropdown with clear labeling solves this.

## Solution
Replace the two separate buttons with a single `DropdownMenu` component. The trigger button shows a monitor icon + "Display Test" label. The dropdown contains two items:

1. **"Push Test Cart"** — calls `handleTestDisplay(reader.id)`, disabled while a test is active
2. **"Clear Test from Reader"** — calls `handleClearDisplay(reader.id)`, always available for online readers

When a test is active (`testingReaderId === reader.id`), the trigger button gets a subtle pulsing indicator or destructive accent to signal that test data is currently on the reader.

## Changes

**File: `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`**

1. Add imports for `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` from `@/components/ui/dropdown-menu` and `ChevronDown` from lucide
2. Replace the two `<Tooltip><Button>` blocks (lines ~776-818) with a single `<DropdownMenu>`:
   - Trigger: `<Button variant="outline" size="sm">` with `<MonitorSmartphone />` icon + "Display Test" + chevron
   - When `testingReaderId === reader.id`, trigger gets amber/destructive styling to indicate active test
   - Menu item 1: `<MonitorSmartphone />` "Push Test Cart" — disabled when testing
   - Menu item 2: `<X />` "Clear Test from Reader" — always enabled
3. Remove the standalone `<Tooltip>` wrappers for both old buttons

