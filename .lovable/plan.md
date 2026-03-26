

## Reorder Drill-Down: Vessels Before Allowance + Vessel-Aware Calculator

### Problem
Currently the drill-down layout is: Allowance config → Vessel selector → Toggles. The natural flow should be: Vessel selector → Allowance config → Toggles, since vessels must be chosen before configuring allowances. Additionally, the calculator dialog is hardcoded to "bowls" only — it should support "bottles" when selected.

### Changes

**File: `ServiceTrackingSection.tsx`**

1. **Move the vessel selector block** (lines 740–792: "Requires Color/Chemical" toggle + Bowls/Bottles pills) **above** the allowance config block (lines 679–727).

2. **Pass `containerTypes`** to the `AllowanceCalculatorDialog` so it knows which vessel types are active.

3. **Gate the "Configure Allowance" button**: only show it when `container_types` has at least one entry (i.e., vessels have been selected).

**File: `AllowanceCalculatorDialog.tsx`**

4. **Accept a new `containerTypes` prop**: `containerTypes: ('bowl' | 'bottle')[]`.

5. **Rename "Bowl" to vessel-generic labels**: When only bottles are selected, show "Bottle 1", "Add Bottle"; when both, allow choosing type per vessel. The `addBowl` function becomes `addVessel` and labels adapt based on the container types.

6. **Use appropriate icons**: `Beaker` for bowls, `TestTube2` for bottles (matching the Dock convention from memory).

7. **Default initial vessel**: First vessel defaults to the first selected container type instead of always "Bowl 1".

### Layout After Change
```text
┌─────────────────────────────────────────────────────┐
│  Requires Color/Chemical  [toggle]                  │
│  Vessels:  [✓ Bowls]  and/or  [+ Bottles]           │
├─────────────────────────────────────────────────────┤
│  📄 Configure Allowance        [Components]         │
│  (or saved summary: "$36.51 · 2 bowls"  [Edit])     │
├─────────────────────────────────────────────────────┤
│  Toggles: Assistant Prep, Smart Mix, etc.           │
└─────────────────────────────────────────────────────┘
```

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`
- `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

