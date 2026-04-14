

# Enable Cellular on S710 Locations + Update Connectivity Copy

## What this does
1. Automatically enables cellular connectivity via the Stripe Terminal Configuration API when creating a location with S710 readers
2. Updates the Connectivity tab copy to explain zero-config cellular to users

## Changes

### 1. Edge function: Enable cellular on location creation
**File:** `supabase/functions/manage-stripe-terminals/index.ts`

After creating a terminal location, create (or update) a Terminal Configuration object for that location with `cellular.enabled = true`. This uses the Stripe API:

```
POST /v1/terminal/configurations
  cellular[enabled] = true
  tipping[usd][fixed_amounts] = ...  (if applicable)
```

Then assign it to the location. Since we can't know at location-creation time whether S710 readers will be registered, we enable cellular by default — it's harmless on S700 (the reader simply ignores it).

Add a new action `enable_cellular` to the edge function so existing locations can also be updated.

### 2. Update Connectivity tab copy
**File:** `src/components/dashboard/settings/terminal/ZuraPayConnectivityTab.tsx`

When `hasS710` is true, add a brief note under the WiFi + Cellular card:
- "Built-in eSIM — no carrier contract or SIM card required. Cellular is enabled automatically for your S710 readers."

When `hasS710` is false, update the upgrade callout to mention zero-config cellular:
- "The S710 includes a built-in eSIM with cellular data bundled — no additional mobile line or setup required."

### 3. No new database tables or RLS changes needed

## Technical detail

The Stripe Terminal Configuration API (`/v1/terminal/configurations`) accepts `cellular[enabled]=true`. This is set per-location. The S710's eSIM activates automatically when this flag is set — no user action required. The S700 ignores the cellular config silently.

