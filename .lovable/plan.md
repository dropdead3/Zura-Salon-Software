

# Restructure Operations Hub Categories

## Summary

Reorganize the Operations Hub from 5 vague sections into 6 domain-specific sections, remove 3 redundant/misplaced cards, and reorder by task frequency.

## Changes

### 1. `src/pages/dashboard/admin/TeamHub.tsx`

**Remove cards:**
- **Website Hub** from Hubs section — belongs in Settings/sidebar, not team operations
- **Manage Invitations** — redundant deep-link to Onboarding Hub tab
- **Program Team Overview** — overlaps with Client Engine Tracker

**Rename and reorder sections:**
- "Hubs" → stays, remove Website Hub
- "People & Development" → **"Team & Development"** (remove redundant cards)
- "Scheduling & Requests" → **"Scheduling & Time Off"** (move Daily Huddle out, move PTO Balances in)
- "Performance & Compliance" → **"Compliance & Documentation"** (remove PTO Balances, add Handbooks)
- "Team Operations & Communications" → split into **"Daily Operations"** and **"Team Services"**

**New section order:**
1. Hubs (5 cards)
2. Daily Operations (4): Daily Huddle, Chair Assignments, Assistant Scheduling, Announcements
3. Scheduling & Time Off (5): Schedule Requests, Shift Swap Approvals, Assistant Requests, Meetings & Accountability, PTO Balances
4. Team & Development (4): Team Directory, Graduation Tracker, Client Engine Tracker, Team Challenges
5. Compliance & Documentation (5): Performance Reviews, Staff Strikes, Document Tracker, Incident Reports, Handbooks
6. Team Services (3): Business Cards, Headshots, Birthdays & Anniversaries

**Cleanup:**
- Remove unused imports (`ClipboardCheck` icon, `canInvite` / `usePendingInvitations` if no longer needed, `Globe` icon)
- Remove `pendingInvitationCount` stat logic

### 2. No other files affected
This is purely a presentation change within TeamHub.tsx. Routes, hub pages, and Settings remain intact.

## Technical details

- Website Hub remains accessible via its route and Settings — only the Operations Hub card is removed
- Onboarding Hub already has the invitations tab — no functionality lost
- Program Team Overview route stays alive for bookmarks

## Result
26 cards across 6 focused sections. Each section has a clear operational domain. High-frequency daily tools surface near the top.

