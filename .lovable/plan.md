

## Relabel "Standard" / "Chemical" Across Service Tracking UIs

### Problem
The labels "Standard" and "Chemical" are unclear. They should read **"No Color/Chemical"** and **"Requires Color/Chemical"** respectively.

### Changes

**1. `ServiceTrackingQuickSetup.tsx`**
- Line 42: Step description → `'Mark services as requiring color/chemical or not.'`
- Line 148: Helper text → `'Classify each service, then save.'`
- Line 169: Button label `Standard` → `No Color/Chemical`
- Line 177: Button label `Chemical` → `Requires Color/Chemical`

**2. `ServiceTrackingSection.tsx`**
- Line 617: Badge text `Chemical` → `Requires Color/Chemical`
- Line 722: Label `Color / Chemical` → `Requires Color/Chemical`
- Line 246: Tooltip text update to match new terminology
- Lines 399, 504: Banner/empty-state copy referencing "chemical services" → "color/chemical services"

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx`
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

