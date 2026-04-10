

# Remove Hubs Section & Redistribute Cards

## Summary
Remove the redundant "Hubs" section from the Operations Hub and redistribute its 5 cards into logical existing or new sections.

## Proposed Section Reorganization

### Current sections (6):
Hubs, Daily Operations, Scheduling & Time Off, Team & Development, Compliance & Documentation, Team Services

### New sections (5):

1. **Daily Operations** — unchanged
   - Daily Huddle, Chair Assignments, Assistant Scheduling, Announcements

2. **Scheduling & Time Off** — unchanged
   - Schedule Requests, Shift Swap Approvals, Assistant Requests, Meetings & Accountability, PTO Balances

3. **People & Development** — renamed from "Team & Development", absorbs hub cards
   - Team Directory, Graduation Tracker, Client Engine Tracker, Team Challenges
   - **+ Onboarding Hub** (from Hubs — new hire onboarding fits people management)
   - **+ Training Hub** (from Hubs — staff training fits development)
   - **+ Hiring & Payroll Hub** (from Hubs — conditional on entitlement, fits people ops)

4. **Client & Business** — new section for external-facing hubs
   - **Client Hub** (from Hubs)
   - **Renter Hub** (from Hubs — booth renters are a business relationship)

5. **Compliance & Documentation** — unchanged
   - Performance Reviews, Incidents & Accountability, Handbooks

6. **Team Services** — unchanged
   - Business Cards, Headshots, Birthdays & Anniversaries

## Changes

### `src/pages/dashboard/admin/TeamHub.tsx`
- Delete the entire "Hubs" `CategorySection` block (lines 315–361)
- Rename "Team & Development" → "People & Development"
- Add Onboarding Hub, Training Hub, and Hiring & Payroll Hub cards into the People & Development section (using `ManagementCard` instead of `HubGatewayCard` for visual consistency with their new peers)
- Add new "Client & Business" section before Compliance & Documentation containing Client Hub and Renter Hub cards (also as `ManagementCard`)
- Reorder sections: Daily Operations → Scheduling & Time Off → People & Development → Client & Business → Compliance & Documentation → Team Services

## Result
- No more "Hubs" section — eliminates the meta-navigation-inside-navigation pattern
- All cards use consistent `ManagementCard` styling
- Logical grouping: people stuff together, client/business stuff together
- Sections auto-hide when all cards are favorited (existing logic)

