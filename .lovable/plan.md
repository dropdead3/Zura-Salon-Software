

# Billing Tab Layout Reorganization

## Current Issues

After reviewing the full `BillingConfigurationPanel.tsx` and all sub-components, here's what needs improving:

1. **Too many separate cards in the left column** — 7 cards stacked vertically creates excessive scrolling and cognitive load
2. **Duplicated per-location fee** — `SetupFeesForm` has a per-location fee field that overlaps with `AddOnsConfigForm`
3. **Save button buried in sidebar** — easy to miss after scrolling through configuration
4. **Pricing configs fragmented** — Custom Pricing, Promotional Pricing, and Setup Fees are all separate cards but relate to the same concern (pricing overrides)
5. **No logical grouping** — Plan, Contract Terms, and Billing Cycle are spread across different cards but form a single "agreement" concept

## Proposed Layout

Consolidate from **7 left-column cards** down to **4** by grouping related concerns:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  BILLING STATUS (full width, unchanged)                             │
├─────────────────────────────────────────────────────────────────────┤
│  CAPACITY USAGE (full width, unchanged)                             │
├──────────────────────────────────────┬──────────────────────────────┤
│  LEFT COLUMN (2/3)                   │  RIGHT SIDEBAR (1/3)         │
│                                      │                              │
│  ┌──────────────────────────────┐    │  ┌────────────────────────┐  │
│  │ 1. SUBSCRIPTION PLAN         │    │  │  INVOICE PREVIEW       │  │
│  │    (unchanged)               │    │  │  (sticky top)          │  │
│  └──────────────────────────────┘    │  │                        │  │
│  ┌──────────────────────────────┐    │  │  [Save Config] button  │  │
│  │ 2. CONTRACT & BILLING TERMS  │    │  └────────────────────────┘  │
│  │    • Billing Cycle           │    │  ┌────────────────────────┐  │
│  │    • Contract Length/Dates   │    │  │  PANDADOC DOCUMENTS    │  │
│  │    • Auto-Renewal / Trial    │    │  └────────────────────────┘  │
│  │    • Setup Fee + Paid toggle │    │  ┌────────────────────────┐  │
│  └──────────────────────────────┘    │  │  CONTRACT ADJUSTMENTS  │  │
│  ┌──────────────────────────────┐    │  └────────────────────────┘  │
│  │ 3. PRICING & DISCOUNTS       │    │  ┌────────────────────────┐  │
│  │    • Custom Price Override   │    │  │  BILLING HISTORY       │  │
│  │    • Discount (% or fixed)   │    │  └────────────────────────┘  │
│  │    • Promotional Pricing     │    │                              │
│  │    (border-t dividers)       │    │                              │
│  └──────────────────────────────┘    │                              │
│  ┌──────────────────────────────┐    │                              │
│  │ 4. CAPACITY ADD-ONS          │    │                              │
│  │    (unchanged)               │    │                              │
│  └──────────────────────────────┘    │                              │
│  ┌──────────────────────────────┐    │                              │
│  │ 5. INTERNAL NOTES            │    │                              │
│  │    (unchanged)               │    │                              │
│  └──────────────────────────────┘    │                              │
└──────────────────────────────────────┴──────────────────────────────┘
```

## Changes

### 1. Merge Contract Terms + Setup Fees → "Contract & Billing Terms" card
- Move `ContractTermsForm` fields and `SetupFeesForm` setup-fee-only fields into one card
- Remove the duplicate per-location fee from `SetupFeesForm` (already in Add-Ons)
- Use `border-t` dividers between sections within the card

### 2. Merge Custom Pricing + Promotional Pricing → "Pricing & Discounts" card
- Combine `CustomPricingForm` and `PromoConfigForm` into a single card with `border-t` divider
- Both relate to price overrides and should be configured together

### 3. Make Invoice Preview + Save button sticky
- Add `sticky top-6` to the sidebar's Invoice Preview + Save button wrapper so it stays visible while scrolling through configuration

### 4. Remove per-location fee from SetupFeesForm
- This field already exists in `AddOnsConfigForm` — having it in both places is confusing
- `SetupFeesForm` becomes setup-fee-only (rename internally or inline into the merged card)

### Files Changed
- **`BillingConfigurationPanel.tsx`** — restructure card layout, merge sections, sticky sidebar
- **`SetupFeesForm.tsx`** — remove per-location fee section (keep only setup fee + paid toggle)

No new components needed. No database changes.

