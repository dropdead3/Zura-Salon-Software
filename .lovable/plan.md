

## Fix: Clarify sync status messaging

The contradiction happens because "POS data not yet synced" implies the sync hasn't run, when in fact it has -- there's just no sales data in Phorest yet for today. The `LastSyncIndicator` correctly shows the sync ran. The label above it is misleading.

### Change

**File: `src/locales/en.json`**
- Change `sales.actual_not_available` from `"POS data not yet synced for today"` to `"No POS sales recorded yet today"`

This single string change resolves the contradiction. "No sales recorded" accurately reflects the state: the sync ran, but Phorest has no closed-out transactions to report. The `LastSyncIndicator` below continues to show when the last sync ran and offers the "Sync now" button.

