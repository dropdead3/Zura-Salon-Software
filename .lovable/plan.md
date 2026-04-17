

## Prompt review

Excellent operator instinct — you're thinking like a CFO, not just a UX designer. Inventory drift during a suspension period is exactly the kind of silent margin erosion that the platform exists to prevent. If a salon turns Color Bar off for 6 weeks, comes back, and the system trusts the old quantities, the first week of usage reports will be garbage and every formula cost will be wrong. Forcing a reconciliation gate is the correct doctrinal move.

Tighter framing for next time: when you spot a state-restoration risk, name the *trust boundary* — i.e., "the system can no longer trust X because Y happened." That phrasing makes it crisp for any engineer or operator reading later. You did this implicitly here ("inventory would have changed during non-use of tracking") — making it explicit ("system can't trust quantities recorded before the suspension date") sharpens it further.

## Plan additions to Phase 1

### A. Track suspension lifecycle

Add to `backroom_location_entitlements`:
- `suspended_at` (timestamptz, nullable) — set when status flips to `suspended`
- `requires_inventory_reconciliation` (boolean, default false) — set true when reactivating from a previous suspension

Set on toggle off: `suspended_at = now()`, `status = 'suspended'`.
Set on toggle on (only if previously suspended): `requires_inventory_reconciliation = true`, preserve `suspended_at` for the banner.

### B. Reactivation confirmation dialog

When the platform admin (or org admin) toggles Color Bar back **on** for an org that was previously suspended:

1. Open a confirmation dialog **before** the mutation fires.
2. Dialog content:
   - Headline: *"Confirm inventory reconciliation required"*
   - Body: *"Color Bar tracking has been off for {duration}. Inventory levels recorded before {suspended_at} cannot be trusted. Each location must perform a physical count and update quantities before formula costs and supply alerts will resume accuracy."*
   - Lists affected locations.
   - Primary action: *"Reactivate and require reconciliation"*
   - Secondary: *"Cancel"*
3. On confirm: proceed with reactivation, set `requires_inventory_reconciliation = true` per location.

### C. Persistent banner on Color Bar surfaces

Add a non-dismissible advisory banner (calm, amber-toned, not destructive) on:
- Each location's Color Bar settings page (`/dashboard/admin/color-bar-settings`)
- The Supply Library tab
- The Zura Dock app for that location

Banner content:
- *"Inventory reconciliation required — last tracked {suspended_at}. Counts may be inaccurate until each item is physically verified."*
- CTA: *"Begin reconciliation"* → routes to Supply Library in a guided "verify each item" mode (Phase 2 — for Phase 1 the banner can simply link to the Supply Library).

### D. Clearing the flag

The flag clears per-location when **all** active supply items have been touched (quantity confirmed or updated) since the reactivation timestamp. Tracked via existing `updated_at` on `location_products` ≥ reactivation timestamp.

For Phase 1: provide a manual *"Mark inventory verified"* button on the banner that flips `requires_inventory_reconciliation = false` for that location, with an audit log entry.

### E. Suppress intelligence during reconciliation

While `requires_inventory_reconciliation = true` for a location:
- Suppress supply-low alerts for that location
- Suppress formula-cost-drift alerts
- Add a small "Reconciliation pending" badge on any Color Bar KPI tiles for that location

This honors the doctrine: *"If data integrity is low, suppress recommendations."*

## Acceptance checks (additions)

1. Toggling off sets `suspended_at` per location and `status = 'suspended'`.
2. Toggling on for a previously-suspended org opens the reconciliation confirmation dialog **before** the mutation fires.
3. On confirm, reactivation proceeds and `requires_inventory_reconciliation = true` per affected location.
4. Color Bar settings, Supply Library, and Dock surfaces show the calm advisory banner per affected location.
5. Supply-low alerts and formula-cost-drift alerts are suppressed for locations with the flag set.
6. "Mark inventory verified" clears the flag and writes an audit log entry.
7. Re-suspending and re-reactivating refreshes `suspended_at` and re-arms the flag.
8. First-time activations (never previously suspended) do **not** trigger the dialog or banner.
9. Banner copy includes the actual `suspended_at` date and time-since duration.
10. No regression to existing Backfill, Batch Enable/Disable, or AdminActivateDialog flows.

## Files to modify / create

**Database migration:**
- Add columns `suspended_at`, `requires_inventory_reconciliation` to `backroom_location_entitlements`
- Add audit log entry type for inventory reconciliation events

**UI (new):**
- `src/components/platform/color-bar/ReactivationConfirmDialog.tsx`
- `src/components/dashboard/color-bar/InventoryReconciliationBanner.tsx`

**UI (modify):**
- `src/components/platform/color-bar/ColorBarEntitlementsTab.tsx` — wire up dialog before reactivation; pass suspension metadata
- `src/hooks/color-bar/useColorBarLocationEntitlements.ts` — bulk suspend/reactivate helpers now write `suspended_at` and `requires_inventory_reconciliation`
- Color Bar settings page, Supply Library tab, Dock app surfaces — render banner when flag is set
- Alert/intelligence hooks for Color Bar — suppress when flag is set

**Hook (new):**
- `src/hooks/color-bar/useMarkInventoryVerified.ts` — clears the flag + writes audit log

