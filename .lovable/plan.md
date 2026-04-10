

# Add 13 Missing Cards to Operations Hub

## Summary
The ManagementHub (now dead code) contained 13 cards not present in the current Operations Hub. Add all of them into logical sections, creating new sections where needed.

## Missing Cards → Proposed Placement

### Existing section: "Client & Business" (add 4 cards)
- **Client Health Hub** — `/admin/client-health` (Brain icon)
- **Feedback Hub** — `/admin/feedback` (MessageSquarePlus icon)
- **Re-engagement** — `/admin/reengagement` (UserCheck icon)
- **Merge Clients** — `/admin/merge-clients` (GitMerge icon)

### Existing section: "Compliance & Documentation" (add 1 card)
- **Document Tracker** — `/admin/documents` (FileText icon, already imported)

### New section: "Recruiting & Hiring" (3 cards, after People & Development)
- **Lead Management** — `/admin/leads` (UserPlus icon)
- **Recruiting Pipeline** — `/admin/recruiting` (Briefcase icon, already imported)
- **New Hire Wizard** — `/admin/payroll?tab=hire` (UserCheck icon, conditional on payroll entitlement)
- **Renter Onboard Wizard** — `/admin/booth-renters?tab=onboarding` (Store icon)

### New section: "Marketing & Visibility" (2 cards, after Client & Business)
- **Website Editor** — `/admin/website-sections` (Globe icon)
- **SEO Workshop** — `/admin/seo-workshop` (Search icon)

### New section: "Configuration & Rewards" (2 cards, at the end)
- **Zura Configuration** — `/admin/zura-config` (Brain icon)
- **Points & Rewards** — `/admin/points-config` (Coins icon, already imported)

## Final Section Order
1. Favorites
2. Daily Operations
3. Scheduling & Time Off
4. People & Development
5. Recruiting & Hiring *(new)*
6. Client & Business *(expanded)*
7. Marketing & Visibility *(new)*
8. Compliance & Documentation *(expanded)*
9. Team Services
10. Configuration & Rewards *(new)*

## Technical Changes

### `src/pages/dashboard/admin/TeamHub.tsx`
- Add missing icon imports: `Globe`, `Search`, `Brain`, `MessageSquarePlus`, `UserCheck`, `GitMerge`, `UserPlus`
- Add new icons to `ICON_MAP` for favorites serialization
- Add 13 new `ManagementCard` entries with favorite wiring (`favProps`, `!isFavorited` guard)
- New Hire Wizard gated behind `isPayrollEntitled`
- Add 3 new `CategorySection` blocks in the JSX

One file changed. All new cards follow the existing pattern with favorite support and conditional rendering.

