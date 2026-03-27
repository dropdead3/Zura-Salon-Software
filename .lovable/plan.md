

## Improve Table Responsiveness: Always-Visible Chevron, Condensed Rows

### Problem
At the current viewport (1312px with sidebar), the "Billing Method" column and "Enable Product Billing" toggle push the expand chevron off-screen. Users can't see or click the dropdown arrow.

### Solution
Restructure the table so the main row only shows essential columns, and move secondary information (billing method badge, status badge) into the expandable detail area. The chevron stays always visible.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**1. Remove the "Billing Method" column from the main table row**
- Remove the `Billing Method` `<TableHead>` from the header
- Remove the Billing Method `<TableCell>` from each service row
- Move the billing method display (Parts & Labor badge, allowance dollar amount, "Allowance Needs To Be Set" badge) into the expanded detail area, alongside the existing billing mode selector

**2. Move the status badge into the expanded detail or Service column**
- Move the "Configured ✓" / "Unconfigured" / "Allowance Set" badge from the toggle column into the Service name column as a subtle inline indicator beneath the category/type badges
- The "Enable Product Billing" column now contains only the Switch — clean and compact

**3. Reduce column count from 5 to 4**
- Checkbox (w-10)
- Service (flex-1, contains name + category + type badge + status badge)
- Enable Product Billing (w-20, just the switch, right-aligned)
- Chevron (w-10, always visible)

**4. Update `colSpan` references**
- Category header row: `colSpan={5}` → `colSpan={4}`
- Expanded detail row: `colSpan={5}` → `colSpan={4}`

**5. Lower table min-width**
- Change `min-w-[600px]` to `min-w-[400px]` since fewer columns need less space

### Result
- Expand chevron is always visible at any viewport width
- Main row is clean: service info + toggle + chevron
- Billing method details and configuration status live in the dropdown where users interact with them
- No horizontal scrolling needed at typical viewport widths

