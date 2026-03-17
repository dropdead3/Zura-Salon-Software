

## Remove Redundant Columns and Strip Size from Product Name

From the screenshot, the table currently shows: Track, Swatch, Name, Category, Depletion, Unit, Wholesale, Markup, Retail, Sizes. Three columns are unnecessary and the product name redundantly includes the container size.

### Changes in `BackroomProductCatalogSection.tsx`

**1. Remove three column headers (lines 880-882):**
Delete the `<TableHead>` entries for Category, Depletion, and Unit.

**2. Remove three column cells (lines 931-941):**
Delete the `<TableCell>` entries for Category badge, Depletion method, and Unit of measure.

**3. Update colSpan** on the empty-state row (line 892) to reflect 3 fewer columns.

**4. Strip size suffix from product name (line 930):**
Replace `{p.name}` with a computed value that strips trailing size patterns like ` — 113g`, ` — 118ml`, ` - 57g`, etc. using a regex: `p.name.replace(/\s*[—–-]\s*\d+\.?\d*\s*(g|ml|oz|L|l)\s*$/i, '')`.

