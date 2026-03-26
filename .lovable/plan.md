

## Configure Allowance & Product Allowance Calculator — Gap Analysis (Round 2)

After reviewing the full 1,331-line dialog, the ServiceTrackingSection integration, and all supporting hooks, here are the remaining gaps, bugs, and enhancements.

---

### Bugs / Technical Debt

**1. Remaining `as any` casts in AllowanceCalculatorDialog**
Three `as any` casts remain:
- Line 304: `.from('services' as any)` — the `services` table likely isn't in the generated types. Needs a proper typed query or an RPC.
- Line 305: `.update({ price: newPrice } as any)` — same root cause.
- Line 532: `.update({ ... } as any)` on `service_recipe_baselines` — the update payload for `bowl_id`, `cost_per_unit_snapshot`, `is_developer`, `developer_ratio` is still cast. The types file may not reflect these columns yet; regenerating types or using an RPC would fix this.

**2. Save logic still uses sequential per-row mutations (not batched)**
The "transactional save" in Phase 1 deletes baselines one-by-one in a loop (line 491–493), then bowls one-by-one (494–496), then re-inserts one-by-one. This is N+M network round-trips. A single RPC or at minimum batched `.in('id', [...])` deletes would be faster and more atomic.

**3. Developer quantity saved incorrectly when color lines exist**
Line 514: `const effectiveQty = line.isDeveloper ? colorQty * line.developerRatio : line.quantity;` — this saves the *computed* effective quantity as `expected_quantity`, but on reload (line 243) it reads `bl.expected_quantity` back as the raw quantity. This means after save-and-reopen, developer lines show inflated gram values (e.g., 60g instead of the ratio-based "1x").

**4. Product catalog query has no upper limit**
Line 148–163: fetches all active Supplies products with no `.limit()`. For salons with large catalogs (1000+ products), this could hit the Supabase default 1000-row limit silently, causing missing products in the picker.

---

### UX Gaps

**5. No confirmation before deleting a bowl**
`removeBowl` (line 325) immediately removes the bowl and all its lines with no confirmation. A bowl with 10+ configured products can be lost with one click. Should mirror the undo-toast pattern used for line removal, or show a confirm dialog.

**6. Bowl label is not editable**
Labels auto-generate as "Bowl 1", "Bowl 2" etc. Operators can't rename bowls to meaningful labels like "Root Bowl" or "Gloss Bowl", which would help in multi-bowl services.

**7. No visual indicator that a service already has an allowance configured (in the table)**
In ServiceTrackingSection, services with existing allowances show a small text line, but there's no color-coded badge or icon in the collapsed table row to quickly scan which services are configured vs. not.

**8. Picker resets when switching between bowls**
Each bowl has its own picker state (good), but there's no way to keep the picker open on the same brand/category when switching between bowls — useful when adding the same product line to multiple vessels.

**9. No "Clear All" action for a bowl**
If an operator wants to start over with a bowl, they must remove products one-by-one. A "Clear Bowl" action on the header would speed this up.

**10. Footer save button disabled when `grandTotal === 0` but no explanation**
Line 1320: `disabled={saving || grandTotal === 0}` — if the user has bowls with only developer products (which compute to $0 when no color lines exist), the save button is disabled with no tooltip explaining why.

---

### Enhancements

**11. Show margin (profit) alongside retail and wholesale in the footer tooltip**
The tooltip (line 1261–1281) shows wholesale, markup, and retail, but doesn't show the actual margin percentage or dollar profit. Adding "Margin: $X.XX (Y%)" would complete the financial picture.

**12. Export/print allowance recipe**
Operators often need to share configured recipes with team leads or post them at stations. A "Copy Summary" or "Export" button that generates a text/clipboard summary of the bowl configuration would be useful.

**13. Service price shown in footer but not editable inline**
The footer shows "of $X service" but the only way to change the price is via the "Use suggested price" button. An inline editable service price field would let operators model scenarios (e.g., "what if I charge $300 instead of $275?").

**14. Allowance policy summary in ServiceTrackingSection lacks health badge**
The service row (line 748–771) shows the allowance text but doesn't surface the health status (healthy/high/low) badge inline. Operators should see at-a-glance which services have unhealthy allowance ratios without opening the calculator.

---

### Summary

| Priority | # | Change | File(s) |
|----------|---|--------|---------|
| P0 | 3 | Fix developer qty save/reload mismatch | AllowanceCalculatorDialog.tsx |
| P1 | 1 | Remove remaining `as any` casts | AllowanceCalculatorDialog.tsx |
| P1 | 2 | Batch delete operations | AllowanceCalculatorDialog.tsx |
| P1 | 4 | Add `.limit()` to catalog query | AllowanceCalculatorDialog.tsx |
| P1 | 5 | Bowl delete confirmation (undo toast) | AllowanceCalculatorDialog.tsx |
| P1 | 10 | Disabled save tooltip explanation | AllowanceCalculatorDialog.tsx |
| P2 | 6 | Editable bowl labels | AllowanceCalculatorDialog.tsx |
| P2 | 7 | Health badge on service rows | ServiceTrackingSection.tsx |
| P2 | 9 | "Clear Bowl" action | AllowanceCalculatorDialog.tsx |
| P2 | 11 | Margin in footer tooltip | AllowanceCalculatorDialog.tsx |
| P2 | 14 | Health badge in service table | ServiceTrackingSection.tsx |
| P3 | 8 | Persist picker brand context | AllowanceCalculatorDialog.tsx |
| P3 | 12 | Copy/export recipe summary | AllowanceCalculatorDialog.tsx |
| P3 | 13 | Inline editable service price | AllowanceCalculatorDialog.tsx |

