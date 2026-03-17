

# Fix Danger Jones Developers: Update Pricing and Sizes

## Current State
6 developers in DB — all missing pricing, wrong sizes (900ml), no swatches.

## Screenshot Data (Vish)

| Product | Wholesale | Markup | Retail | Size |
|---------|-----------|--------|--------|------|
| 5 Volume Deluxe Cream Developer | $9.65 | 100% | $19.30 | 863g |
| 10 Volume Deluxe Cream Developer | $9.65 | 100% | $19.30 | 863g |
| 20 Volume Deluxe Cream Developer | $9.65 | 100% | $19.30 | 863g |
| 30 Volume Deluxe Cream Developer | $9.65 | 100% | $19.30 | 863g |
| 40 Volume Deluxe Cream Developer | $9.65 | 100% | $19.30 | 863g |
| Gloss Toner 6 Volume 1.8% Developer | $7.80 | 100% | $15.60 | 907g |

## Changes

Single UPDATE for the 5 Deluxe Cream Developers:
- `wholesale_price` → `9.65`
- `default_markup_pct` → `100`
- `size_options` → `['863g']`

Separate UPDATE for the Gloss Toner Developer:
- `wholesale_price` → `7.80`
- `default_markup_pct` → `100`
- `size_options` → `['907g']`

All 6 products already exist — names match. No inserts or deactivations needed. Data-only changes.

