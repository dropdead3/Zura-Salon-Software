

# Fix Operations Hub Card Sizing & UI Polish

## Problems Identified

1. **HubGatewayCard** uses fixed `h-[108px]` — cards with longer titles (e.g., "Hiring & Payroll Hub", "Zura Backroom Hub") overflow or clip content
2. **ManagementCard** uses `min-h-[88px]` — inconsistent with hub cards
3. Cards in incomplete rows (row 3: Website Hub + Zura Backroom) stretch differently than full rows
4. The Renter Hub card shows a rogue `ChevronRight` (likely from a stat badge interaction) while other hub cards don't show it until hover

## Changes

### `src/pages/dashboard/admin/TeamHub.tsx`

**HubGatewayCard:**
- Replace `h-[108px]` with `min-h-[108px]` so cards with longer content can grow while maintaining a consistent baseline
- Add `h-full` to ensure all cards in a grid row stretch to match the tallest card (CSS grid implicit equal height)

**ManagementCard:**
- Standardize to `min-h-[88px]` (already correct) + ensure `h-full` is on the Card (already present)

**Both card types — unified padding:**
- Confirm both use `p-5` padding (both already do)
- Ensure description uses identical `text-xs text-muted-foreground mt-0.5 line-clamp-2` (both already do)

**Grid layout polish:**
- Add `items-stretch` to the grid container in `CategorySection` so all cards in a row match height
- For the Hubs section specifically, ensure the last incomplete row cards don't stretch to fill the full width — keep them at grid column width

**Summary of actual code changes:**
1. `HubGatewayCard`: Change `h-[108px]` → `min-h-[108px]` on CardContent, keep `h-full` on the outer Card link wrapper
2. `CategorySection`: Add `items-stretch` to the grid div (cards already have `h-full`)
3. Ensure the Link wrapper in `HubGatewayCard` has `h-full` class (like ManagementCard already does implicitly via Card's `h-full`)

