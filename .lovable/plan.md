

# Nested Radius Hierarchy Audit — Platform Bento System

## Problem

Parent containers and child cards share the same radius tier (both using `rounded-[16px]`), creating visual flattening. There is no enforced parent-child radius step-down, so nested structures look like merged surfaces rather than framed modules.

## Key Violations Found

| Pattern | Parent Radius | Child Radius | Issue |
|---|---|---|---|
| Overview → StatCards | 16px (via grid, implicit) | 16px | Same level |
| Overview → Quick Actions container → QuickActionButtons | 16px | 12px (rounded-xl) | OK but container padding tight |
| PlatformLiveAnalytics → MetricCards | 16px | 12px (rounded-xl) | OK |
| IncidentManagementCard → active incident / form | 16px | 12px (rounded-xl) | OK |
| CapitalControlTower → EligibilityReference / OrgOperationalContext | PlatformCard 16px | rounded-lg (8px) | Too large a jump |
| PlatformCard(glass) → inner content cards | 16px | 16px (same PlatformCard) | **Flat** — e.g. ColorBarAnalyticsTab KPICards inside glass containers |
| Settings tabs (KnowledgeBase, etc.) → nested PlatformCards | 16px | 16px | **Flat** |

## Solution — Three-Tier Nested Radius Hierarchy

Update `platform-bento-tokens.ts` to add explicit nesting-aware tokens and update the `PlatformCard` to support a `nested` prop.

### Updated Token System

```text
Tier          Radius    Use
───────────── ──────── ─────────────────────────
container     22px     Outer wrapping containers (Quick Actions panel, glass parent cards)
card          16px     Standard cards (StatCards, analytics panels)  
inner         12px     Nested cards inside containers (MetricCards, form sections, checklist items)
micro         10px     Badges, pills, toggles, chips
```

This replaces the current 5-tier system (micro/small/medium/large/xl) with clearer nesting semantics while keeping xl for modals/dialogs.

### Changes

**1. `src/lib/platform-bento-tokens.ts`**
- Add `container: 'rounded-[22px]'` tier
- Rename for clarity: `large` → remains 16px (standard card), `xl` stays 20px (dialogs)
- Add `nested` key pointing to `small` (12px) for explicit inner-card usage
- Add `NESTING_RULES` comment block documenting the hierarchy

**2. `src/components/platform/ui/PlatformCard.tsx`**
- Update `size` prop map: `lg` now maps to `container` (22px) when used as an outer wrapper
- Add new prop `nested?: boolean` — when true, forces `small` (12px) radius regardless of size
- Default behavior unchanged for standalone cards (16px)

**3. `src/pages/dashboard/platform/Overview.tsx`**
- Quick Actions container: `rounded-[16px]` → `rounded-[22px]` (container tier), padding stays `p-5`
- StatCards: keep `rounded-[16px]` (card tier — they're top-level, not nested)
- Skeleton containers: match parent radii

**4. `src/components/platform/overview/PlatformLiveAnalytics.tsx`**
- Outer container: `rounded-[16px]` → `rounded-[22px]` (container tier, it holds MetricCards)
- MetricCards inner: already `rounded-xl` (12px) — correct
- Skeleton: match parent

**5. `src/components/platform/overview/IncidentManagementCard.tsx`**
- Outer container: `rounded-[16px]` → `rounded-[22px]`
- Inner incident/form sections: already `rounded-xl` (12px) — correct

**6. `src/components/platform/overview/PlatformActivityFeed.tsx`**
- Outer container: `rounded-[16px]` → `rounded-[22px]`

**7. `src/components/platform/overview/SystemHealthCard.tsx`**
- Outer container: `rounded-[16px]` → `rounded-[22px]`
- Inner elements (icon boxes): `rounded-xl` — correct

**8. `src/pages/dashboard/platform/CapitalControlTower.tsx`**
- EligibilityReferenceList inner sections: `rounded-lg` (8px) → `rounded-xl` (12px) for consistency
- OrgOperationalContext: same treatment

**9. Platform-wide: All `PlatformCard variant="glass"` used as parent containers**
- When a glass card contains other cards or structured content blocks, bump to `rounded-[22px]`
- Files affected: `KnowledgeBaseTab.tsx`, `AccountNotesSection.tsx`, `ColorBarAnalyticsTab.tsx`, `DockAppTab.tsx`, `PlatformTeamManager.tsx`, `AccountUsersTab.tsx`, `AccountImportHistoryTab.tsx`, `BillingConfigurationPanel` (lazy), settings cards
- Implementation: Add a `container` size to PlatformCard that maps to 22px, then use `size="container"` on parent glass cards

**10. `src/pages/dashboard/platform/SystemHealth.tsx`**
- Outer section cards: `rounded-xl` → `rounded-[22px]` (container)
- Inner stat tiles: `rounded-xl` (12px) — correct

**11. Skeleton states** across all updated files must match their live counterparts' radii.

### PlatformCard API Change

```tsx
// Before
<PlatformCard variant="glass">           {/* 16px */}
  <PlatformCard variant="interactive">   {/* 16px — FLAT */}

// After  
<PlatformCard variant="glass" size="container">  {/* 22px */}
  <PlatformCard variant="interactive" size="md">  {/* 14px — clear hierarchy */}
```

### Shared Curvature Illusion (Apple-Level Polish)

Where inner cards sit flush against a container edge (e.g., grid children touching container padding boundary), the inner card radius echoes `parent_radius - parent_padding`. With 22px outer and 16px padding, inner cards at ~12px create the optical alignment where curves feel continuous. This is already achieved by the 22px → 12px step with `p-4` (16px) padding — the math: `22 - 16 = 6`, inner should be `22 - 6 = 16` or less. At 12px it's comfortably smaller, creating the framed module effect.

## Scope

~15 files. No logic changes. No database changes. Purely radius hierarchy enforcement.

| File | Change |
|---|---|
| `platform-bento-tokens.ts` | Add `container` tier (22px), add nesting docs |
| `PlatformCard.tsx` | Add `container` size option mapping to 22px |
| `Overview.tsx` | Quick Actions → 22px outer |
| `PlatformLiveAnalytics.tsx` | Outer → 22px |
| `IncidentManagementCard.tsx` | Outer → 22px |
| `PlatformActivityFeed.tsx` | Outer → 22px |
| `SystemHealthCard.tsx` | Outer → 22px |
| `CapitalControlTower.tsx` | Inner sections `rounded-lg` → `rounded-xl` |
| `SystemHealth.tsx` | Section cards → 22px, inner tiles stay 12px |
| `KnowledgeBaseTab.tsx` | Parent glass → container size |
| `AccountNotesSection.tsx` | Parent glass → container size |
| `ColorBarAnalyticsTab.tsx` | Parent glass → container size |
| `DockAppTab.tsx` | Parent glass → container size |
| `PlatformTeamManager.tsx` | Parent glass → container size |
| `AccountUsersTab.tsx` | Parent glass → container size |

