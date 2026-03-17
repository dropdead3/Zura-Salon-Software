

## Remove "Epilogue Permanent Color — 60ml" from the catalog

**What happened**: A generic "Epilogue Permanent Color — 60ml" product exists in the database `products` table (id: `d5a02d55-c425-48c1-b0b8-08c05b954c8e`) as an active item. This is not a real product — the actual Epilogue shades are the individually named entries (e.g., "Epilogue 1-0 Natural"). It's already deactivated in the supply library, but still active in the organization's product catalog.

**Fix**: Soft-delete this product by setting `is_active = false` via a database migration. No code file changes needed — the static data file (`professional-supply-library.ts`) does not contain this entry.

### Steps

1. **Run a migration** to deactivate the product:
   ```sql
   UPDATE products
   SET is_active = false, updated_at = now()
   WHERE id = 'd5a02d55-c425-48c1-b0b8-08c05b954c8e';
   ```

That's it — one database update. The product will disappear from all active views since all queries filter on `is_active = true`.

