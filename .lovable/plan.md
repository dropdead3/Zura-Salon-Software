

## Organize Services by Category, Then Alphabetically

### Problem
Services are sorted only by name (alphabetically), making it hard to scan related services. The screenshot shows Extensions, Blonding, Styling, and Haircuts all interleaved.

### Solution
1. **Sort data by category first, then name** — update the query `.order('category').order('name')` instead of just `.order('name')`.
2. **Add visual category group headers** — insert a subtle category separator row in the table whenever the category changes, so users can quickly scan sections (e.g., "Blonding", "Color", "Extensions", "Haircuts", "Styling").
3. **Use `service_category_colors` display_order** — match the category ordering used elsewhere in the app (from the `service_category_colors` table) so categories appear in the same consistent order.

### Changes — `ServiceTrackingSection.tsx`

1. **Query**: Change `.order('name')` to `.order('category').order('name')` (line 117).

2. **Sort filtered results**: After filtering/searching, sort `searchedServices` using the `service_category_colors` display_order (fetch this data via existing query pattern). Services without a category go last.

3. **Category header rows**: In the table render loop, detect when a service's category differs from the previous one and insert a lightweight separator row:
   ```tsx
   <TableRow className="bg-muted/30 pointer-events-none">
     <TableCell colSpan={4} className="py-1.5 px-4">
       <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">
         {category}
       </span>
     </TableCell>
   </TableRow>
   ```

4. **Add category order query**: Fetch `service_category_colors` with `display_order` to sort categories consistently (same pattern already used in `usePhorestServices.ts`).

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

