

# Stripe Terminal Display — What's Customizable vs. Firmware-Locked

## The Reality

The "Tap or insert" screen you photographed (blue concentric circles, Stripe-default styling) is **rendered by Stripe's reader firmware**. When `processPaymentIntent` is called, Stripe takes full control of the display. The Stripe Terminal API does **not** expose any parameters to change the payment collection screen's colors, layout, or branding.

**What the Stripe Terminal API actually controls:**

| Surface | Customizable? | How |
|---------|--------------|-----|
| Splash/idle screen | Yes | Already implemented (splash uploader) |
| Cart display (line items before payment) | Yes — content only | `setReaderDisplay` with line items |
| Tap/insert payment screen | **No** | Firmware-controlled by Stripe |
| Tipping screen | Partial — percentages only | Via Terminal Configuration API |
| Processing/success screens | **No** | Firmware-controlled |

The blue concentric circles and white background are baked into the S710 firmware. There is no API parameter, Terminal Configuration field, or workaround to change them to match your organization's brand colors.

## What We CAN Do

### 1. Update the Simulator to Match Reality
The in-app S710 simulator currently shows a **dark-themed, brand-colored** tap screen — which sets incorrect expectations. We should update the simulator's "Tap" screen to match what the real reader actually displays (white background, blue rings, Stripe's native look) so operators know exactly what clients will see.

### 2. Add an Explanatory Note in the Display Tab
Add a brief, honest note in the Checkout Display card explaining that the payment collection screen is controlled by the payment processor's firmware and cannot be customized, while the splash screen and cart line items are fully brandable.

### 3. Maximize the Surfaces We Control
Ensure the **cart display** (the screen shown BEFORE tapping) includes the business name and is as branded as the API allows. The `setReaderDisplay` call currently only sends `description`, `amount`, and `quantity` per line item — that's the full extent of Stripe's cart API. No logo, no colors.

## Proposed Changes

### File: `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx`
- Update the `TapScreen` component to render with a **white background** and **blue/purple concentric circles** matching the real S710 firmware UI, instead of the current dark-themed branded version
- Keep the dark-themed branded look for splash, idle, cart, and tip screens (those are actually customizable)
- Add a small "Stripe firmware" badge on the tap screen in the simulator to signal it's not customizable

### File: `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx`
- Add a note in the "Your Checkout Experience" section clarifying which screens are brandable (splash, cart, tip percentages) vs. firmware-locked (tap/insert, processing, success)

## What This Does NOT Include
- There is no hidden Stripe API to change the tap screen appearance — this plan is honest about that constraint
- No edge function changes needed — the limitation is at the Stripe firmware level, not our integration

