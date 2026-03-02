

## Reorganize Operations Hub for Intuitive Navigation

The current page has the "Hubs" section buried among 9 other category sections. The reorganization promotes Hubs to a prominent top-level gateway and consolidates the remaining cards into fewer, more logical groupings.

### New Page Structure

```text
┌─────────────────────────────────────────────┐
│  Operations Hub (header)                    │
├─────────────────────────────────────────────┤
│  ★ HUB GATEWAY (full-width, prominent)     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Client  │ │ Growth  │ │ Hiring &│       │
│  │ Hub     │ │ Hub     │ │ Payroll │       │
│  ├─────────┤ ├─────────┤ ├─────────┤       │
│  │ Renter  │ │ Chair   │ │         │       │
│  │ Hub     │ │ Assign. │ │         │       │
│  └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────┤
│  PEOPLE & DEVELOPMENT (merged from         │
│    "Team Development" + "Team Invitations"  │
│    + "Team Directory")                      │
├─────────────────────────────────────────────┤
│  SCHEDULING & REQUESTS (unchanged)          │
├─────────────────────────────────────────────┤
│  PERFORMANCE & COMPLIANCE (merge in         │
│    "PTO & Leave" cards here)                │
├─────────────────────────────────────────────┤
│  TEAM OPERATIONS & COMMS (merge             │
│    "Team Operations" + "Communications"     │
│    + "Points & Rewards")                    │
├─────────────────────────────────────────────┤
│  AI & AUTOMATION (unchanged)                │
└─────────────────────────────────────────────┘
```

### Changes — single file: `src/pages/dashboard/admin/TeamHub.tsx`

**1. Promote Hub Gateway to 3-column grid at top**
- Change from `columns={2}` to `columns={3}` so Hub cards fill the width consistently with other sections, avoiding a visually orphaned 5th card.

**2. Merge small sections into logical groups**
- **"People & Development"**: Combine current "Team Development" + "Team Invitations" sections. Team Directory, Onboarding, Graduation Tracker, Training Hub, Challenges, Program Overview, Invite Dialog, and Manage Invitations all live here.
- **"Performance & Compliance"**: Absorb "PTO & Leave" (PTO Balances card moves here). Performance Reviews, Strikes, Documents, Incidents, PTO Balances.
- **"Team Operations & Communications"**: Merge "Team Operations" + "Communications" + "Points & Rewards". Birthdays, Business Cards, Headshots, Announcements, Changelog, Points Config.
- **"AI & Automation"**: Stays as-is (single card is fine here as a distinct domain).

**3. Remove the now-empty standalone sections**
- Delete the separate "PTO & Leave", "Team Invitations", "Communications", and "Points & Rewards" `CategorySection` blocks.

No new files. No route changes. No database changes.

