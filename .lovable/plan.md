

# Update S700 Label — Replace "Entry-level terminal"

## Problem
The S700 card label reads "Entry-level terminal," which implies the product is cheap or inferior. This undermines confidence in the hardware.

## Change

**File:** `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx`, line 35

Replace:
```
label: 'Entry-level terminal',
```
With:
```
label: 'Standard connectivity',
```

This pairs cleanly with the S710's "Full NeverDown protection" label — both describe connectivity tier rather than product quality. The S700 uses WiFi; the S710 adds cellular failover. "Standard connectivity" communicates that distinction without diminishing the S700.

One-line change, no other files affected.

