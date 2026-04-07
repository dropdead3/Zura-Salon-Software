

# Apply Lazy-Loading to Other Heavy Pages

## Pages Identified

After auditing the codebase, here are the pages that would benefit most from the same lazy-loading pattern applied to Settings:

### High Impact

**1. `DashboardHome.tsx` (845 lines, ~30 imports)**
The main dashboard eagerly imports ~30 components including analytics cards, drawers, banners, and widgets. Many are conditionally rendered based on role or layout config. Lazy-loading the heavier, role-gated sections would significantly reduce initial chunk size.

Components to lazy-load:
- `AIInsightsDrawer`, `PersonalInsightsDrawer`
- `PinnedAnalyticsCard`, `AnalyticsFilterBar`
- `WidgetsSection`, `DashboardSetupWizard`, `DashboardCustomizeMenu`
- `TodaysQueueSection`, `TodaysPrepSection`, `StylistPushList`
- `ActiveCampaignsCard`, `InventoryManagerDashboardCard`
- `GraduationKpiTile`, `LevelProgressNudge`
- `PaydayCountdownBanner`, `InsightsNudgeBanner`

**2. `PlatformSettings.tsx` (7 tab components, all eager)**
Every tab (Account, Team, Appearance, Security, Import Templates, Defaults, Integrations) loads upfront even though only one is visible at a time.

**3. `AccountDetail.tsx` (622 lines, ~8 heavy tab components)**
Platform account detail page loads all tab content (Users, Settings, Import History, Billing, Notes, Integrations, Apps) eagerly.

### Medium Impact

**4. `TrainingHub.tsx` (4 tab components)**
`VideoLibraryManager`, `IndividualAssignments`, `TeamProgressDashboard`, `TrainingQuizManager` — all load even when only "Library" tab is active.

**5. `ZuraConfigPage.tsx` (4 tab components)**
`PersonalityTab`, `KnowledgeBaseTab`, `RoleRulesTab`, `GuardrailsTab` — all eager.

**6. `WebsiteSectionsHub.tsx` (5 editor components in COMPONENT_MAP)**
`HeroEditor`, `TestimonialsEditor`, `FAQEditor`, `GalleryDisplayEditor`, `CustomSectionEditor` — all imported statically even though only one section editor renders at a time.

**7. `DayRateSettings.tsx` (2 tab components)**
`ChairManager` and `AgreementEditor` — minor impact but follows the same pattern.

## Approach

Same pattern used in Settings:
- Convert tab/section content imports to `React.lazy()` with named-export wrapper
- Wrap render areas in `<Suspense fallback={<DashboardLoader />}>`
- Use `lazyWithRetry` for route-level pages (already done in App.tsx for most)

## Priority Order

1. **DashboardHome** — highest traffic page, biggest bundle impact
2. **PlatformSettings** — 7 tabs, platform admin page
3. **AccountDetail** — 622 lines, 8 tabs
4. **WebsiteSectionsHub** — 5 editor components
5. **TrainingHub** — 4 tabs
6. **ZuraConfigPage** — 4 tabs
7. **DayRateSettings** — 2 tabs (smallest gain)

## Scope
- 7 files modified
- ~40 imports converted to lazy
- Suspense wrappers added per file
- No database changes

