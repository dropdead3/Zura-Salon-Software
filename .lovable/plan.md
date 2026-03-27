

# Page Explainers: Full Platform Coverage + Tokenized Build Rules

## Overview
Add page explainers to every page across the platform (org dashboard + platform admin), create a centralized content registry, and codify the build rule that every new page must include one.

## Current State
- **~10 pages** have explainers (mostly Color Bar settings sections)
- **~80+ pages** across org dashboard and platform admin have none
- Two components exist: `Infotainer` (org-level toggle-aware) and `FirstTimeCallout` (localStorage only)
- The toggle in SuperAdminTopBar already controls `Infotainer` visibility

## Architecture

### 1. Create a Page Explainer Content Registry
**New file: `src/config/pageExplainers.ts`**

A single source of truth mapping page IDs to their explainer content (title, description, icon). Every page's explainer content lives here — not scattered across individual page files.

```text
PAGE_EXPLAINERS = {
  // Main Nav
  'command-center': { title, description, icon },
  'schedule': { ... },
  'team-chat': { ... },
  
  // My Tools
  'today-prep': { ... },
  'my-mixing': { ... },
  'my-stats': { ... },
  'my-pay': { ... },
  'training': { ... },
  // ... all myTools pages
  
  // Admin Hubs
  'analytics-hub': { ... },
  'team-hub': { ... },
  'client-hub': { ... },
  'growth-hub': { ... },
  'access-hub': { ... },
  'payroll': { ... },
  'settings': { ... },
  // ... all admin pages
  
  // Platform Pages
  'platform-overview': { ... },
  'platform-accounts': { ... },
  // ... all 23 platform pages
  
  // Color Bar (existing, migrated here)
  'color-bar-stations': { ... },
  'color-bar-inventory': { ... },
  // ... etc
}
```

### 2. Create a `<PageExplainer>` Convenience Component
**New file: `src/components/ui/PageExplainer.tsx`**

A thin wrapper around `Infotainer` that takes just a `pageId` and pulls content from the registry:

```tsx
<PageExplainer pageId="analytics-hub" />
```

This reduces boilerplate on every page to a single line.

### 3. Add `<PageExplainer>` to Every Page (~80+ files)

Pages grouped by section — each gets a one-liner added after the page header:

**Main Nav (3 pages):** Command Center, Schedule, Team Chat  
**My Tools (12 pages):** Today's Prep, My Mixing, Waitlist, My Stats, My Pay, Training, Program, Leaderboard, Shift Swaps, Rewards, Ring the Bell, My Graduation  
**Admin Hubs & Sub-pages (~40 pages):** Analytics Hub, Team Hub, Client Hub, Growth Hub, Access Hub, Payroll, Color Bar Settings, Settings, Sales Dashboard, Onboarding Tracker, Recruiting, Performance Reviews, Stylist Levels, etc.  
**Platform Pages (23 pages):** Overview, Accounts, Health Scores, Benchmarks, Onboarding, Migrations, Jobs, Coach Dashboard, Activity Log, System Health, Payments Health, Notifications, Analytics, Knowledge Base, Revenue, Billing Guide, Color Bar, Permissions, Feature Flags, Settings, etc.

### 4. Migrate Existing Inline Explainers
Move hardcoded explainer content from these files into the registry:
- Color Bar sections (6 files)
- `ForecastingCard.tsx` (FirstTimeCallout)
- Replace inline `<Infotainer>` calls with `<PageExplainer pageId="..." />`

### 5. Accurate Explainer Descriptions
Every description will be re-analyzed against the actual page purpose. Examples:

| Page | Title | Description |
|------|-------|-------------|
| Command Center | Your Daily Operating View | Surfaces today's appointments, KPIs, alerts, and pinned analytics in one view. Start every day here. |
| Schedule | Booking Calendar | View and manage appointments across all staff and locations. Drag to reschedule, click to book. |
| Analytics Hub | Performance Intelligence | Drill into revenue, retention, utilization, and growth metrics across configurable time periods and locations. |
| Payroll | Payroll & Commissions | Run payroll, review commission calculations, manage pay schedules, and track payroll history. |
| Access Hub | Roles & Permissions | Control what each role can see and do. Manage invitations, module visibility, and team PINs. |
| Platform Overview | Platform Command Center | Monitor all accounts, recent activity, and system health from a single view. |

*(Full descriptions for all ~80 pages will be written during implementation)*

### 6. Update Build Rules
**Update `src/lib/design-rules.ts`** — Add a `PAGE_EXPLAINER_RULES` section:

```ts
PAGE_EXPLAINER_RULES: {
  required: 'Every dashboard page MUST include a <PageExplainer pageId="..." /> component',
  registry: 'Content must be registered in src/config/pageExplainers.ts before use',
  placement: 'Immediately after DashboardPageHeader, before main content',
  component: '<PageExplainer> from @/components/ui/PageExplainer.tsx',
  styling: 'Blue ghost aesthetic — bg-blue-500/[0.04], border-blue-500/20, BookOpen icon',
  prohibited: ['Inline explainer content (use registry)', 'Skipping explainer on new pages'],
}
```

### 7. Add Design Token for Explainer
**Update `src/lib/design-tokens.ts`** — Add explainer token:

```ts
explainer: {
  container: 'rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-5 pr-12',
  eyebrow: 'font-display text-[10px] tracking-[0.1em] uppercase text-blue-400/70',
  title: 'font-display text-sm tracking-wide text-foreground',
  description: 'text-sm text-muted-foreground leading-relaxed',
  iconBox: 'h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center',
  icon: 'h-4 w-4 text-blue-400',
}
```

## Files Changed
- **New:** `src/config/pageExplainers.ts` (content registry)
- **New:** `src/components/ui/PageExplainer.tsx` (convenience component)
- **Modified:** `src/lib/design-tokens.ts` (add explainer tokens)
- **Modified:** `src/lib/design-rules.ts` (add build rules)
- **Modified:** ~80 page files (add `<PageExplainer>` one-liner)
- **Modified:** ~6 Color Bar section files (migrate to registry)

## Execution Note
This is a large but mechanical task. Each page file change is a single import + one-liner addition. The registry and descriptions are the substantive work.

