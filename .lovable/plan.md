
## Move Analytics Cards Above Client Health Pulse

**What changes:**
Swap the order of the stats cards (Total Clients, VIP, At Risk, etc.) and the Client Health Pulse card on the Client Directory page, so the analytics cards appear first.

### Technical Details

**File: `src/pages/dashboard/ClientDirectory.tsx`**

Lines 756-798 will be reordered so the Stats Cards `BentoGrid` block (currently lines 763-798) moves above the Client Health Summary Widget block (currently lines 756-761).

**New order:**
1. Tabs (All Clients / My Clients) -- unchanged at line 740
2. Stats Cards (`BentoGrid` with Total Clients, VIP, At Risk, New Clients, Total Revenue, Top Source) -- moved up
3. Client Health Pulse (`ClientHealthSummaryCard`) -- moved down

This is a layout-only change with no logic or data modifications.
