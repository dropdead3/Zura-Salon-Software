

# Fix Danger Jones Lighteners: Add Missing Product + Update Pricing/Sizes

## Current State
Database has 2 lighteners: "Cream Lightener with Bonding Complex" and "Epilogue Lightener" — both missing pricing and using incorrect sizes (450g/900g).

Screenshot from Vish shows 2 lighteners with validated data:

| Product | Wholesale | Markup | Retail | Size |
|---------|-----------|--------|--------|------|
| Cream Lightener with Bonding Complex | $17.00 | 200% | $51.00 | 227g |
| Powder Lightener with Bonding | $29.00 | 200% | $87.00 | 500g |

## Changes

1. **Update "Cream Lightener with Bonding Complex"**: Set `wholesale_price = 17.00`, `default_markup_pct = 200`, `size_options = ['227g']`, `swatch_color = '#7EC8D8'` (light blue from screenshot).

2. **Add "Powder Lightener with Bonding"**: New row — `wholesale_price = 29.00`, `default_markup_pct = 200`, `size_options = ['500g']`, category `lightener`.

3. **Deactivate "Epilogue Lightener"**: Not present in Vish — likely not a real lightener product (Epilogue is the permanent color line). Set `is_active = false`.

All data-only changes via the insert tool.

