

# Add Accessory Descriptions and Images

## Problem
The accessory cards (Hub, Dock, Case) show only a name, price, and a generic Package icon. Users don't know what each accessory does or what it looks like.

## Changes

### 1. Add `description` field to `HardwareAccessory` interface
**File:** `src/hooks/useTerminalHardwareOrder.ts`

Add an optional `description` field to the `HardwareAccessory` interface.

### 2. Add descriptions to fallback accessory data
**File:** `supabase/functions/terminal-hardware-order/index.ts`

Add a `description` field to each fallback accessory entry (both the API fallback and the full fallback block):

- **Hub** — "Ethernet connectivity adapter. Provides a hardwired network connection for maximum reliability."
- **Dock** — "Countertop charging stand. Keeps your reader powered and upright at the checkout station."
- **Case** — "Protective silicone sleeve for handheld use. Adds grip and drop protection for tableside payments."

Also pull `description` from the Stripe API response for `apiAccessories` when available.

### 3. Update accessory card UI with description text and better image handling
**File:** `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx`

- Below the accessory product name, add a `<p className="text-xs text-muted-foreground">` line showing the description (when present)
- The image is already handled (`acc.image_url` with fallback to Package icon) — the CDN URLs in the edge function should resolve to Stripe's official accessory photos. No frontend image changes needed.

### 4. Verify fallback image URLs
The current CDN URLs (`b.stripecdn.com/terminal-ui-resources/img/hardware_skus/verifone/s700_hub.png`, etc.) should serve the official Stripe accessory images. If these fail, the existing Package icon fallback handles it gracefully.

## Summary
- Each accessory gets a one-line description explaining its purpose
- Images already flow from `image_url` — they should render once the CDN URLs are valid
- Minimal changes: interface tweak, edge function data enrichment, one extra `<p>` tag in the UI

