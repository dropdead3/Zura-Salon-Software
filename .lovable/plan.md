

# Follow-Up Loader Rollout — Remaining Card/Section-Level Loaders

## Scope

From the search results, here are the remaining **card/section-level** loaders that should be converted to `<DashboardLoader>`. I'm excluding:
- **GoalCardWithData** — inline KPI value spinner, not a section loader (skip)
- **AppointmentDetailSheet clientNotes** — tiny inline indicator next to a heading (skip)
- **ImageUploadInput** — contextual upload spinner with "Uploading..." text (skip)
- **AIInsightsCard lever loading** — small inline collapsible trigger indicator (skip)
- Button spinners throughout (already excluded)

### Convertible files (~30)

**Components:**

| File | Size | Context |
|------|------|---------|
| `access-hub/ResponsibilitiesSubTab.tsx` | lg | Full section loader |
| `dashboard/LeaderboardWeightsManager.tsx` | md | Section loader |
| `dashboard/ServiceCommunicationFlowEditor.tsx` | md | Section loader |
| `dashboard/transactions/ClientBalanceCard.tsx` | sm | Card loader |
| `dashboard/clients/ClientRedoHistory.tsx` | sm | Section loader |
| `dashboard/settings/StylistOverridesContent.tsx` | sm | Section loader |
| `dashboard/backroom/UsageVarianceSummary.tsx` | sm | Card loader |
| `dashboard/schedule/QuickBookingPopover.tsx` (×2) | sm | List area loaders |
| `dashboard/schedule/AppointmentDetailSheet.tsx` (visit history only) | sm | Sub-section loader |
| `coaching/PendingMeetingRequests.tsx` | md | Card loader |
| `coaching/AccountabilityOverview.tsx` | md | Card loader |
| `huddle/TodaysHuddleCard.tsx` | sm | Card loader |
| `team-chat/ExpandableSearch.tsx` | sm | Search results loader |

**Pages:**

| File | Size | Context |
|------|------|---------|
| `pages/dashboard/Program.tsx` | md | Full page loader |
| `pages/dashboard/Schedule.tsx` | lg | Full page loader |
| `pages/dashboard/MeetingDetails.tsx` | lg | Full page loader |
| `pages/dashboard/NotificationPreferences.tsx` | lg | Full page loader |
| `pages/dashboard/TeamDirectory.tsx` | lg | List loader |
| `pages/dashboard/RewardShop.tsx` (×2) | md | Tab content loaders |
| `pages/dashboard/meetings/MyMeetings.tsx` | md | Card loader |
| `pages/dashboard/meetings/CoachRequests.tsx` | md | Card loader |
| `pages/dashboard/admin/BusinessCardRequests.tsx` | md | List loader |
| `pages/dashboard/admin/HeadshotRequests.tsx` | md | List loader |
| `pages/dashboard/admin/BackroomSettings.tsx` | md | Page loader |
| `pages/dashboard/admin/DashboardBuild.tsx` | lg | Page loader |
| `pages/dashboard/admin/ScheduleRequests.tsx` | md | List loader |
| `pages/dashboard/admin/AnnouncementBarManager.tsx` | lg | Page loader |
| `pages/Shop.tsx` | lg | Page loader |
| `pages/Services.tsx` | lg | Page loader |

## Execution

Same mechanical pattern as the first pass:
1. Add `import { DashboardLoader } from '@/components/dashboard/DashboardLoader'`
2. Replace `<div className="flex items-center justify-center ..."><Loader2 className="w-N h-N animate-spin text-muted-foreground" /></div>` with `<DashboardLoader size="..." className="..." />`
3. Clean up `Loader2` from lucide imports where no longer needed

Size mapping: `w-4`/`w-5` → `sm`, `w-6` → `md`, `w-8` → `lg`

~30 files, batched in groups of 8 for parallel editing.

