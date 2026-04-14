

# Add Tooltips to Connectivity Status Cards

## What changes

**File:** `src/components/dashboard/settings/OfflinePaymentStatus.tsx`

Add a `MetricInfoTooltip` to each of the three status subcards (Connection, Pending Forward, Forwarded), positioned in the top-right corner using `relative` on the card container and `absolute top-2 right-2` on the tooltip icon.

### Tooltip descriptions

1. **Connection** — "Shows your current network status. When WiFi drops, S710 readers automatically switch to cellular. S700 readers rely on store-and-forward."

2. **Pending Forward** — "Payments accepted while offline that are queued on-device, waiting to be authorized when connectivity returns. A count above zero means payments are stored but not yet settled."

3. **Forwarded** — "Payments that were accepted offline and have since been successfully authorized and settled after connectivity was restored."

### Layout approach
Each subcard `div` gets `relative` added to its className. The `MetricInfoTooltip` is placed as an absolutely-positioned element at `top-3 right-3` so it sits in the top-right corner without disrupting the existing layout.

