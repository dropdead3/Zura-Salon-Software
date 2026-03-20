

## Fix: No Services in Demo Mode — Wrong Default Location

### Root Cause
The previous fix correctly auto-selects the first location, but **"North Mesa" (the first location by display_order) has zero synced services** in `phorest_services`. Only "Val Vista Lakes" has 78 active services. So the query works fine — it just returns an empty set for the default location.

### Two-Part Fix

**1. Sync services for North Mesa** (data fix)
- The `phorest_services` table only has records for branch `6YPlWL5os-Fnj0MmifbvVA` (Val Vista Lakes)
- North Mesa's branch `hYztERWvOdMpLUcvRSNbSA` has no service records at all
- Copy the 78 active services for North Mesa's branch so both locations have services. This is likely a sync gap — both locations should offer the same service catalog.

**2. Smarter default location selection** (code fix)
- In `DockPinGate.tsx` and `DockDeviceSwitcher.tsx`, instead of blindly picking `locations[0]`, prefer a location that actually has services
- Alternatively, default to "Val Vista Lakes" specifically since it has data, or show a clear message when the selected location has no services with guidance to switch locations

### Recommended approach
The cleanest fix is **option 1**: insert service records for North Mesa's branch so both locations work. This is a data completeness issue, not a code bug. The auto-select logic is correct.

### Changes

**Database migration** — Insert phorest_services for North Mesa's branch by duplicating the Val Vista Lakes services with the correct `phorest_branch_id`:
```sql
INSERT INTO phorest_services (phorest_service_id, phorest_branch_id, name, category, duration_minutes, price, requires_qualification, is_active, allow_same_day_booking, lead_time_days, same_day_restriction_reason)
SELECT phorest_service_id, 'hYztERWvOdMpLUcvRSNbSA', name, category, duration_minutes, price, requires_qualification, is_active, allow_same_day_booking, lead_time_days, same_day_restriction_reason
FROM phorest_services
WHERE phorest_branch_id = '6YPlWL5os-Fnj0MmifbvVA' AND is_active = true;
```

**No code changes needed** — the existing auto-select and service query logic will work once both locations have service data.

