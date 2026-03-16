

# Backroom Add-On Calculator

## What
Add an interactive **Backroom Calculator** widget to the Billing Guide page that lets you punch in locations, scales, and estimated color services to get a real-time monthly/annual Backroom quote.

## Inputs
- **Number of locations** (default 1) — $20/mo each
- **Number of scales** (default 1) — $199 one-time + $10/mo license each
- **Estimated color services/month** — $0.50 each (usage-based)
- **Include hardware toggle** — whether to show the one-time hardware cost

## Output (receipt-style)
- Location fees: `locations × $20/mo`
- Scale licenses: `scales × $10/mo`
- Usage estimate: `services × $0.50`
- **Total monthly recurring**
- **One-time hardware**: `scales × $199`
- **Annual projection**: monthly × 12
- **Estimated waste savings**: services × avg product cost × 12% (using the same `BASELINE_WASTE_RATE` from `useBackroomPricingEstimate`)

## Changes

### `src/pages/dashboard/platform/BillingGuide.tsx`
- Add `'backroom-calc'` to `SECTIONS` nav array
- Add a `BackroomCalculatorWidget` component below the existing Backroom card (or replace the static card with the interactive version)
- Simple `useState` inputs, no hooks needed — all constants are hardcoded per the pricing model ($20/loc, $0.50/service, $199 hardware, $10/mo license)
- Receipt-style result panel matching the existing `ResultRow` pattern

Single file change, no database or routing changes needed.

