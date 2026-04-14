

# Enhance Terminal Order Cards — Per-Model Feature Breakdown

## Problem
The Hardware tab currently shows a single combined "S700/S710" card with no differentiation between the two models. Users cannot understand the feature differences or make an informed choice about which reader to order.

## What changes

### 1. Replace single reader card with two distinct product cards
**File:** `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx`

Replace the single pricing preview row (lines 179–205) with two side-by-side product cards in a `grid sm:grid-cols-2` layout:

**S700 Card:**
- Icon: Smartphone
- Name: Zura Pay Reader S700
- Subtitle: Countertop and handheld
- Feature chips/bullets: WiFi connectivity, Store-and-forward offline payments, 4" touchscreen display
- Price from SKU data (or fallback)
- Label: "Entry-level terminal"

**S710 Card:**
- Icon: Smartphone with Signal overlay or distinct icon
- Name: Zura Pay Reader S710
- Subtitle: Countertop and handheld
- Feature chips/bullets: WiFi + Cellular failover (built-in eSIM), Store-and-forward offline payments, 4" touchscreen display, Real-time auth during WiFi outages
- A small emerald "Recommended" badge
- Price from SKU data (or fallback)
- Label: "Full NeverDown protection"

Each card uses `bg-muted/30 border rounded-xl p-4` styling consistent with the existing design. The S710 card gets a subtle `border-emerald-500/30` highlight to indicate the recommended option.

### 2. Update the Order Dialog to include model selection
In the purchase dialog, add a model selector (two clickable cards or a select) so users explicitly choose S700 or S710. The selected model flows through to the checkout items and hardware request metadata.

### 3. Keep the zero-markup callout and order history unchanged
The emerald DollarSign callout and the order history section remain as-is below the product cards.

### Technical notes
- The SKU data currently returns a single SKU. If only one SKU exists, both cards show the same price with a note that the same hardware ships for both (Stripe provisions the model based on availability). If the API returns multiple SKUs in the future, map them by product name.
- Feature lists use small `text-xs` bullet items with check icons for clean scanability.
- All typography follows design tokens — `font-display` for prices, `font-sans` for descriptions, no bold above `font-medium`.

