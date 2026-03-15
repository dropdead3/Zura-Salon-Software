

# Add `refund_eligible_until` to Location Entitlements

## Overview

Add a `refund_eligible_until` timestamp column to `backroom_location_entitlements`, auto-set to `activated_at + 30 days`. Surface it in the platform admin entitlements UI and the hook interface.

## Changes

### 1. Database Migration
Add column with a default computed from `activated_at`:
```sql
ALTER TABLE public.backroom_location_entitlements
ADD COLUMN refund_eligible_until TIMESTAMPTZ;

-- Backfill existing rows
UPDATE public.backroom_location_entitlements
SET refund_eligible_until = (activated_at::timestamptz + interval '30 days')
WHERE refund_eligible_until IS NULL;

-- Default for new rows via trigger (since activated_at is set at insert time)
CREATE OR REPLACE FUNCTION public.set_refund_eligible_until()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.refund_eligible_until IS NULL THEN
    NEW.refund_eligible_until := NEW.activated_at::timestamptz + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_refund_eligible_until
  BEFORE INSERT ON public.backroom_location_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_refund_eligible_until();
```

### 2. Stripe Webhook (`stripe-webhook/index.ts`)
Add `refund_eligible_until` to the entitlement rows created on checkout completion, set to `activated_at + 30 days`.

### 3. Hook (`useBackroomLocationEntitlements.ts`)
Add `refund_eligible_until` to the `BackroomLocationEntitlement` interface. Add a helper `isRefundEligible(locationId)` that checks if `refund_eligible_until > now()`.

### 4. Platform Admin UI (`BackroomEntitlementsTab.tsx`)
Show a "Refund eligible" or "Refund window closed" badge on each location entitlement row based on the timestamp. Use green badge if still eligible, muted if expired.

### 5. Paywall UI (`BackroomPaywall.tsx`)
No changes — the money-back guarantee messaging is already static. The timestamp is for internal enforcement only.

| File | Action |
|------|--------|
| Migration SQL | Add column + backfill + trigger |
| `stripe-webhook/index.ts` | Set `refund_eligible_until` on entitlement creation |
| `useBackroomLocationEntitlements.ts` | Add field to interface + `isRefundEligible` helper |
| `BackroomEntitlementsTab.tsx` | Show refund eligibility badge per location |

