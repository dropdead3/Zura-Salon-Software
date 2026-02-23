

## Ensure Page Descriptions Exist Across All Pages

### Current State

After auditing all 90+ dashboard pages, the finding is encouraging: **the vast majority already have descriptions**. They are implemented using three different patterns:

1. **`DashboardPageHeader` with `description` prop** (13 pages) -- cleanest, preferred pattern
2. **`PlatformPageHeader` with `description` prop** (20 pages) -- platform admin pages
3. **Raw `<h1>` + `<p>` inline** (60+ pages) -- functional but inconsistent

No pages were found with a title and **zero** description text. However, several pages have weak or overly brief descriptions that could be improved, and the inconsistent patterns create visual and structural drift.

### Strategy

Given the scale (90+ files), this will be organized into batches by page category. Each batch migrates raw `<h1>` + `<p>` headers to `DashboardPageHeader` (for org-scoped pages) or `PlatformPageHeader` (for platform-admin pages), adding or improving descriptions as needed.

### Description Quality Standard

Every page description should answer: **"What can I do here?"** in one sentence. Advisory-first tone, no shame language.

### Batch 1: Team Member Pages (12 files)

| File | Current State | New Description |
|------|--------------|-----------------|
| `Stats.tsx` | Raw h1 + p, has description | Migrate to `DashboardPageHeader`. Keep existing description. |
| `Training.tsx` | Raw h1 + p | "Complete assigned training videos and track your progress across all categories." |
| `Progress.tsx` | Raw h1 + p | "Visualize your 75-day program journey, track streaks, and celebrate milestones." |
| `MyHandbooks.tsx` | Raw h1 + p | "Review and acknowledge required training materials and team documents." |
| `MyGraduation.tsx` | Raw h1 + p, no description | "Submit proof of completion for graduation requirements and track review status." |
| `MyPay.tsx` | Raw h1 + p | Keep existing description. Migrate to `DashboardPageHeader`. |
| `RingTheBell.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |
| `WeeklyWins.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |
| `Leaderboard.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |
| `RewardShop.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |
| `ShiftSwapMarketplace.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |
| `NotificationPreferences.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |

### Batch 2: Shared/Hub Pages (10 files)

| File | Current State | New Description |
|------|--------------|-----------------|
| `ClientDirectory.tsx` | Raw h1 + p | Keep existing (dynamic per tab). Migrate to `DashboardPageHeader`. |
| `TeamDirectory.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |
| `TeamCalendar.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |
| `Campaigns.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |
| `Changelog.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |
| `AllNotifications.tsx` | Card-based title, no description | "View all announcements and system notifications in one place." |
| `AssistantSchedule.tsx` | Uses tokens, has description | Already good, just uses inline pattern. Migrate to `DashboardPageHeader`. |
| `Transactions.tsx` | Raw h1 + p | Keep existing. Migrate to `DashboardPageHeader`. |
| `ScheduleMeeting.tsx` | Uses tokens, has description | Already good. Migrate to `DashboardPageHeader`. |
| `HelpCenter.tsx` | Raw h1, center-aligned | Unique layout (search-centric). Leave as-is -- different UX pattern. |

### Batch 3: Admin/Management Pages (25 files)

| File | Current State | New Description |
|------|--------------|-----------------|
| `TrainingHub.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `LeadManagement.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `DayRateSettings.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `Announcements.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `ChallengesDashboard.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `PointsConfig.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `PerformanceReviews.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `IncidentReports.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `TeamBirthdays.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `FeatureFlags.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `BusinessCardRequests.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `ReportsHub.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `DataImport.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `DailyHuddle.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `Handbooks.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `PhorestSettings.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `MarketingAnalytics.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `StaffStrikes.tsx` | Raw h1 + p | "Track and manage team accountability records and policy violations." |
| `OnboardingTracker.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `HomepageStylists.tsx` | Raw h1 + p, weak description | "Control which team members appear on the public website and their display order." |
| `StylistLevels.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `RecruitingPipeline.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `TeamOverview.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `GraduationTracker.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `HeadshotRequests.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |

### Batch 4: Settings and Remaining Pages (8 files)

| File | Current State | New Description |
|------|--------------|-----------------|
| `Settings.tsx` (main view) | Raw h1 + p | Keep. Already has description. |
| `Settings.tsx` (category view) | Uses `DashboardPageHeader` | No description -- add category-specific descriptions. |
| `FeaturesCenter.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `AccessHub.tsx` | Raw h1 + p | Keep. Already has description. Migrate to `DashboardPageHeader`. |
| `ChangelogManager.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `PTOManager.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `ScheduleRequests.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |
| `ShiftSwapApprovals.tsx` | Raw h1 + p | Keep. Migrate to `DashboardPageHeader`. |

### Pages to Leave As-Is

These pages already use the correct header components with descriptions, or have unique layouts that don't fit the pattern:

- All pages using `DashboardPageHeader` with `description` (AppointmentsHub, AnalyticsHub, ManagementHub, etc.)
- All pages using `PlatformPageHeader` with `description` (platform admin pages)
- `HelpCenter.tsx` -- unique center-aligned search layout
- `DashboardHome.tsx` -- command center, no traditional page header
- `Schedule.tsx` -- custom calendar header with its own component
- `Onboarding.tsx` -- wizard flow, not a standard page
- `Program.tsx` -- dynamic "Day N" header
- `MyProfile.tsx` -- context-dependent header (already has description)
- Renter portal pages -- isolated portal with own header patterns

### Technical Approach Per File

For each file, the change is:
1. Import `DashboardPageHeader` (if not already)
2. Replace the raw `<h1>` + `<p>` + back button pattern with a single `DashboardPageHeader` component
3. Pass `title`, `description`, `backTo`, and `backLabel` props
4. Move any inline action buttons to the `actions` prop
5. Remove the now-unused direct icon imports (e.g., `ArrowLeft`) if they were only used for the back button

### Files Modified

~55 files across `src/pages/dashboard/` and `src/pages/dashboard/admin/`. No database changes. No new components. No hook changes.

### What Does NOT Change

- Pages already using `DashboardPageHeader` or `PlatformPageHeader` with descriptions
- The `DashboardPageHeader` component itself
- Database schema
- Routing
- Page functionality

