

## Standardize Stylist Names to "First L." Format Everywhere

### Problem
Stylist names appear inconsistently across the app. Many places show full names or `display_name || full_name` without formatting to "First L." (e.g., "Jamie V." instead of "Jamie Vieira").

### Approach

A `formatDisplayName(fullName, displayName)` utility already exists in `src/lib/utils.ts` and correctly produces "First L." output. The fix is to replace all raw `display_name || full_name` patterns with calls to this utility.

**Scope**: ~116 component/hook files contain `display_name || full_name` patterns that bypass the formatter.

### Add Convenience Overload

Add a shorthand to `src/lib/utils.ts` that accepts the common object shape directly:

```ts
export function formatName(profile: { full_name?: string | null; display_name?: string | null }): string {
  return formatDisplayName(profile?.full_name || '', profile?.display_name);
}
```

### Files to Update (grouped by area)

**Schedule & Appointments** (~15 files)
- `AddTimeBlockForm.tsx` — team member selects
- `ShiftEditorDialog.tsx` — staff selects
- `MeetingCard.tsx` — attendee avatars
- `QuickBookingPopover.tsx` — already does it inline, switch to utility
- `AppointmentDetailSheet.tsx` — stylist name display
- `DayView.tsx` — already imports it, verify all paths use it
- `WalkInDialog.tsx` — stylist select dropdown

**Analytics & Sales** (~12 files)
- `ClientEngagementCard.tsx` — staff breakdown names
- `ServicePopularityChart.tsx` — stylist names in drilldowns
- `StaffRevenueLeaderboard.tsx` — leaderboard names
- `StylistExperienceCard.tsx` — experience card
- `AssistantUtilizationCard.tsx` — already imports, verify usage

**Hooks (data layer)** (~15 files)
- `useLiveSessionSnapshot.ts` — "Happening Now" stylist names
- `useClientExperience.ts` — staff name resolution
- `useRevenueByCategoryDrilldown.ts` — staffName mapping
- `useServiceClientAnalysis.ts` — stylistRebook names
- `useAggregatedRetailGoals.ts` — employee names
- `useCommissionStatements.ts` — renter/employee names
- `useBookingSystem.ts` — staff_name field

**Team & Admin** (~20 files)
- `ViewProfile.tsx` — profile header
- `ViewAsPopover.tsx` — team member list
- `AccountManagement.tsx` — user names
- `UserRolesTableView.tsx` — role table names
- `PhorestSettings.tsx` — staff mapping names
- `BusinessCardRequests.tsx` — request names
- `PerformanceReviews.tsx` — team member selects

**Chat** (~5 files)
- `MessageItem.tsx`, `ThreadMessageItem.tsx`, `PinnedMessagesSheet.tsx` — sender names

**Client-facing** (~5 files)
- `KioskBrowseScreen.tsx` — already has inline formatter, switch to shared utility
- `HomepagePreviewModal.tsx` — stylist cards
- `StylistFlipCard.tsx` — already uses `formatDisplayName`

**Platform / Layout** (~5 files)
- `PlatformHeader.tsx` — logged-in user name
- `Onboarding.tsx` — requester name

**Booth Renters & Payroll** (~8 files)
- `RenterDetailSheet.tsx`, `StationAssignmentManager.tsx`
- `EmployeePayrollForm.tsx`

**Edge Functions** (~3 files)
- `send-welcome-dms`, `send-insights-email`, `notify-low-score` — server-side name formatting

### Special Cases
- **Initials for avatars**: Keep using first char of formatted name (still works)
- **Phorest staff names** (from `phorest_staff_mapping`): These are raw names like "Jamie Vieira" — apply the same "First L." formatting via `formatDisplayName(phorestName, null)`
- **Search/filter logic** (e.g., `ViewAsPopover` filtering by name): Must search against both raw full name AND formatted name to avoid breaking search

### Execution Order
1. Add `formatName()` convenience helper to `utils.ts`
2. Update hooks (data layer) first — names flow downstream
3. Update components file by file, importing `formatDisplayName` or `formatName`
4. Update edge functions last

This is a large refactor (~80+ files). Each change is mechanical: replace `x.display_name || x.full_name` with `formatDisplayName(x.full_name, x.display_name)`.

