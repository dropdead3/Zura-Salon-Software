
# Show Assistant Badges on DayView Appointment Cards

## Context

In DayView, each column already represents a stylist, so the current top-right `StylistBadge` (showing the lead stylist) is redundant information. What operators actually need is to see **which assistants** are scheduled on each appointment at a glance.

## What Changes

### 1. Enhance assistant data hook (`useAppointmentAssistantNames.ts`)

Currently this hook only returns `Map<string, string[]>` (appointment ID to list of name strings). It needs to also return profile data (photo_url, display_name, full_name) so we can render avatar badges.

- Add `photo_url` to the profile select query
- Export a new type `AssistantProfile` with `{ display_name, full_name, photo_url }`
- Add a second return map: `Map<string, AssistantProfile[]>` keyed by appointment ID
- The hook will return both `assistantNamesMap` (for backward compat with WeekView/AgendaView tooltips) and `assistantProfilesMap` (for DayView badges)

### 2. Pass assistant profiles to DayView (`Schedule.tsx`)

- Destructure `assistantProfilesMap` from the updated hook
- Pass it as a new prop to the DayView component

### 3. Replace StylistBadge with AssistantBadges on DayView cards (`DayView.tsx`)

**Remove**: The current `StylistBadge` in the top-right corner (lines 311-319) which redundantly shows the column's own stylist.

**Add**: When the appointment has assistants, render assistant avatar badges in the top-right corner instead:
- Each assistant gets a small `h-5 w-5` circle badge (photo or initials)
- Multiple assistants stack horizontally with `-space-x-1` overlap
- Each badge has a tooltip showing the assistant's name
- A `Users` icon prefix (h-3 w-3) appears before the badges to indicate these are assistants

**Visual design**:
- Badge container: `absolute top-0.5 right-0.5 z-10 flex items-center -space-x-1`
- Each badge: `h-5 w-5` circle, `bg-muted/80 backdrop-blur-sm`, `text-[8px] font-medium`
- Photo avatars use the Avatar component at the same size
- Tooltip: assistant name with `Users` icon
- Hidden on compact cards (duration < 30min)

### 4. Keep StylistBadge on WeekView and AgendaView

Those views show all stylists together (not in columns), so the existing StylistBadge with assistant tooltip remains appropriate there.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useAppointmentAssistantNames.ts` | Add `photo_url` to query; export `assistantProfilesMap` alongside existing names map |
| `src/pages/dashboard/Schedule.tsx` | Pass `assistantProfilesMap` to DayView |
| `src/components/dashboard/schedule/DayView.tsx` | Replace `StylistBadge` with assistant avatar badges; add `assistantProfilesMap` prop to DayViewProps and AppointmentCardProps |
