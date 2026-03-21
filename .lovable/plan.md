

## Implement 4 Client Intelligence Enhancements in DockClientTab

### 1. Editable Medical Alerts
Allow stylists to add/update allergy info directly from the Client tab.

**Changes:**
- Add an "Edit" pencil icon button next to the "Allergy / Sensitivity" section header
- When no alert exists, show an "Add Medical Alert" button
- On tap, open an inline editable textarea (not a sheet — keep it lightweight)
- On save, update `phorest_clients.medical_alerts` or `clients.medical_alerts` via direct Supabase update
- Invalidate the `dock-client-profile` query on success
- Add a small `useMutation` inline in the component for the update

### 2. Preferred Stylist Indicator
Show which stylist the client visits most as a badge in the Identity Card.

**Changes:**
- Fetch `preferred_stylist_id` in the existing client profile query (add it to the `select` for `phorest_clients`)
- Use existing `usePreferredStylist(preferredStylistId)` hook to resolve the display name
- Render a badge in the badges row: `"Prefers: [Stylist Name]"` with a `Heart` icon, violet tint
- If the current appointment stylist differs from preferred, show a subtle amber "Different stylist" note

### 3. Retail Repurchase Reminders
Flag products nearing typical repurchase cycles based on purchase frequency.

**Changes:**
- Extend the existing `useClientProductAffinity` data (already fetched) with repurchase logic
- In the "Frequently Purchased" section, for products purchased 2+ times, compute the average days between purchases from `phorest_transaction_items`
- If the last purchase was longer ago than 1.2× the average interval, show an amber "May need restock" pill next to the product
- This is a UI-only computation on existing data — add a small helper function `computeRepurchaseStatus` in the component

### 4. Color History Timeline — Formula Evolution View
Dedicated section showing how formulas have changed across visits.

**Changes:**
- Add a new "Formula History" section after "Last Formula" 
- Use existing `useClientFormulaHistory(clientId)` hook (already built for `ClientFormulaHistoryTab`)
- Render a compact vertical timeline: date → service name → key product lines (truncated to 2 lines max)
- Show last 5 entries, collapsed with "Show more" if more exist
- Reuse the same card styling as visit history rows

### Files

| Action | File |
|--------|------|
| Modify | `src/components/dock/appointment/DockClientTab.tsx` — all 4 enhancements |
| Modify | `src/hooks/useClientProductAffinity.ts` — add `lastPurchaseDate` + `avgDaysBetween` to return type (already has `lastPurchaseDate`, need interval calculation) |

### No database changes needed
- `medical_alerts` column already exists on both tables
- `preferred_stylist_id` already exists on `phorest_clients`
- `client_formula_history` table already exists
- `phorest_transaction_items` already has the data for repurchase analysis

