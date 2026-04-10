

# Restructure Sidebar: Split Operations Hub & Rename "Manage"

## Current state

The **Manage** section contains three items:
- Analytics Hub
- Operations Hub  
- Report Generator

## Problem

Operations Hub is a fundamentally different domain — it's about people, scheduling, and daily team management. Analytics Hub and Report Generator are about data visibility and reporting. Grouping them together under "Manage" is too generic.

## Naming consideration

"Data" works but feels flat. Given the platform doctrine ("Intelligence" is a core pillar), **"Intelligence"** aligns better with the product vocabulary — Analytics Hub and Report Generator are both intelligence surfaces. However, "Intelligence" might feel heavy for just two items. **"Data & Reports"** is clearer and more descriptive. I'll go with **"Data & Reports"** but happy to change if you prefer another name.

## Changes

### 1. `src/config/dashboardNav.ts`
- Split `manageNavItems` into two arrays:
  - `dataNavItems` — Analytics Hub, Report Generator
  - `opsNavItems` — Operations Hub (single item, its own section)

### 2. `src/hooks/useSidebarLayout.ts`
- Add new section entries:
  - `SECTION_LABELS`: `data: 'Data & Reports'`, `ops: 'Operations'`
  - `DEFAULT_SECTION_ORDER`: Insert `data` and `ops` where `manage` was
  - `DEFAULT_LINK_ORDER`: Add entries for `data` and `ops`
  - Keep `manage` in legacy mappings for backward compat with stored layouts

### 3. `src/components/dashboard/SidebarNavContent.tsx`
- Accept and wire up the new `dataNavItems` and `opsNavItems` props
- Add `data` and `ops` to `sectionItemsMap`
- Keep `manage` mapped to `managerNavItems` for backward compat
- Update visibility logic: `data` and `ops` follow the same admin/coach gating as `manage` did

## Result

Sidebar sections become:
- **Main** — Command Center, Schedule, Appointments & Transactions
- **My Tools** — personal staff tools
- **Operations** — Operations Hub
- **Data & Reports** — Analytics Hub, Report Generator
- **Zura Apps** — marketplace + active apps
- **System** — Settings

