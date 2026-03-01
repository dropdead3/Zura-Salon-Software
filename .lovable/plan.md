

## Remove Back Buttons from Organization Dashboard Pages

Great observation -- with the browser-style back/forward arrows in the top menu bar (`NavigationHistoryContext`), the per-page back buttons are redundant and add visual clutter.

### Scope

Remove the `backTo` / `backLabel` props from all `DashboardPageHeader` usages across dashboard pages, and remove any custom inline "Back to X" buttons. This affects **~50+ files** across three areas:

**1. `DashboardPageHeader` `backTo` prop usage (~45 files)**
Pages under `/dashboard/admin/`, `/dashboard/meetings/`, and top-level `/dashboard/` pages that pass `backTo` to `DashboardPageHeader`. Simply remove the `backTo` and `backLabel` props from each call.

Key files include:
- `admin/`: ManagementHub, AccountManagement, DocumentTracker, IncidentReports, StaffStrikes, BusinessCardRequests, HeadshotRequests, TeamBirthdays, ChangelogManager, PointsConfig, PTOManager, ShiftSwapApprovals, ScheduleRequests, DailyHuddle, OnboardingTracker, GraduationTracker, RecruitingPipeline, PerformanceReviews, SalesDashboard, MergeClients, SEOWorkshopHub, ZuraConfigPage, DecisionHistoryPage, ChallengeDetail, plus any others
- `meetings/`: MeetingInbox, Commitments, MeetingDetails, ScheduleNewMeeting, MyMeetings
- Top-level: TodayPrep, ViewProfile, ShiftSwapMarketplace

**2. Custom inline back buttons (~5 files)**
Pages that render their own `<ArrowLeft>` + "Back to X" button outside of `DashboardPageHeader`:
- `SalesDashboard.tsx` (custom back link)
- `OnboardingTracker.tsx` (custom back link)
- `ViewProfile.tsx` (multiple "Back to Directory" buttons)
- `meetings/ScheduleNewMeeting.tsx` (inline back button)
- `meetings/MyMeetings.tsx` (inline back button)

**3. `PlatformPageHeader` `backTo` prop usage (~10 files)**
Platform admin pages under `/dashboard/platform/`:
- Overview, Accounts, AccountDetail, Revenue, Jobs, KnowledgeBase, Notifications, SystemHealth, StripeHealth, FeatureFlags, Settings/Permissions, PandaDocIntegrationPage

### What stays
- The `backTo` prop definition remains in `DashboardPageHeader` and `PlatformPageHeader` components (no breaking API change -- just unused for now)
- Public-facing pages (e.g., `Policies.tsx` "Back to Home") are **not** touched since they don't have the top-bar navigation arrows

### Approach
- Batch-remove `backTo` and `backLabel` props from all `DashboardPageHeader` and `PlatformPageHeader` calls in dashboard pages
- Remove custom inline back buttons and their `ArrowLeft` imports (clean up unused imports)
- No layout shifts expected since the back button area simply won't render

