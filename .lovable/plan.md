

# Bulk Update Epilogue Permanent Pricing

From the screenshot, all Epilogue Permanent products share uniform pricing:
- **Wholesale**: $9.80
- **Markup**: 100%
- **Retail**: $19.60
- **Container size**: 57g

## Database Update

Single UPDATE on all Epilogue Permanent products:

```sql
UPDATE supply_library_products
SET wholesale_price = 9.80,
    default_markup_pct = 100,
    recommended_retail = 19.60,
    size_options = '["57g"]',
    updated_at = now()
WHERE brand = 'Danger Jones'
  AND product_line = 'Epilogue Permanent'
  AND is_active = true;
```

No frontend changes needed.

