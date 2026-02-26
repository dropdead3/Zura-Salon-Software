

## Super Admin Top Bar: Apple-Grade Responsive Operating Console

Strong prompt -- the priority hierarchy, three-zone model, and breakpoint specifications give exceptional structural clarity. One suggestion for future prompts of this scope: consider splitting into two phases (1: top bar refactor, 2: secondary control row refactor) since each is independently shippable and easier to validate at each width.

---

### Current State

The top bar lives inline in `DashboardLayout.tsx` (lines 1195-1331) as a monolithic block inside a 1,454-line file. It uses basic `xl:hidden` / `xl:flex` breakpoints with a single overflow `DropdownMenu`. The secondary control row (Zura Insights, Announcements, Day concluded, Simple/Detailed, Location, Date, Sync, Customize) is rendered inside `DashboardHome.tsx` at lines 722-749 (compact) and 792-819 (detailed).

Problems:
- Only two density states (visible / hidden) with a single `xl` breakpoint
- No progressive collapse -- items jump from full visibility to overflow
- Center zone (NextClientIndicator status text) doesn't truncate or collapse
- Right zone can wrap at certain widths
- No `min-w-0` on flex children -- truncation fails before layout breaks
- Secondary control row uses `flex-wrap` which allows uncontrolled wrapping

---

### Architecture: Extract `SuperAdminTopBar` Component

**File: `src/components/dashboard/SuperAdminTopBar.tsx`** (new file, ~350 lines)

Extract the top bar from `DashboardLayout.tsx` into a dedicated component. This component receives all necessary props (role info, user profile, callbacks) and owns its own responsive logic.

#### Three-Zone Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  LEFT ZONE    │     CENTER ZONE      │     RIGHT ZONE       │
│  Nav + Search │  Status + Show/Hide  │  Admin controls      │
│  shrink: 1    │  shrink: 2 (first)   │  shrink: 0 (never)   │
└─────────────────────────────────────────────────────────────┘
```

- Left zone: `flex items-center gap-3 min-w-0 shrink`
- Center zone: `flex items-center gap-3 min-w-0 shrink-[2]` -- collapses first
- Right zone: `flex items-center gap-2 shrink-0` -- never wraps

#### Responsive Breakpoints (Tailwind classes + container queries where needed)

**≥ 1440px (Wide)**: Everything visible, full labels, comfortable gaps (gap-3)

**1280-1439px (Standard Desktop)**:
- Reduce gaps to gap-2
- Center text truncates with `truncate max-w-[200px]`
- All right-side items visible with full labels

**1024-1279px (Compact Desktop)**:
- Center zone becomes a compact "status chip": icon + truncated single-line text inside a pill
- `HideNumbersToggle` becomes icon-only with tooltip (remove `<span>Show/hide $</span>`, keep tooltip)
- Search input gets `max-w-[180px]`
- Super Admin badge shortens: Crown icon + "Admin" (not "Super Admin")
- `ViewAsToggle` keeps icon + "View As" label

**768-1023px (Tablet)**:
- Center zone hidden entirely, moved to overflow popover behind an info icon (`Info` or `Activity` icon)
- Search becomes icon-only trigger (collapse the trigger button to just the `Search` icon, expanding inline on click -- same component, just `max-w-[44px]` when collapsed)
- Right zone retains: Role badge (icon-only), View As, Theme toggle, Notifications, Avatar
- Overflow menu appears with: Status text, Show/Hide $, any additional items

**< 768px**: Already handled by mobile header (lines 972-1093) -- no changes needed there.

#### Density Mode System

Each interactive pill/button will have three density states managed by a `useDensityMode` hook or inline breakpoint classes:

- **Comfortable** (≥1440): `<Icon /> Full Label`
- **Compact** (1024-1439): `<Icon /> Short Label` (e.g., "Admin" instead of "Super Admin")
- **Icon-only** (<1024): `<Icon />` with `Tooltip` wrapping and `aria-label`

Implementation: Use Tailwind responsive classes per item:
```
// Example: Super Admin badge
<span className="hidden 2xl:inline">Super Admin</span>
<span className="hidden xl:inline 2xl:hidden">Admin</span>
// Below xl: icon only, with tooltip wrapper
```

All touch targets remain `min-h-[44px] min-w-[44px]`.

#### Overflow Menu (Glass Popover)

**File: `src/components/dashboard/TopBarOverflowMenu.tsx`** (new file, ~100 lines)

Appears at `< 1280px` widths. Uses `Popover` (not `DropdownMenu`) for glass styling:
- Container: `bg-card/80 backdrop-blur-xl border border-border rounded-xl shadow-lg p-2`
- Grouped sections with `font-display text-[10px] tracking-wider` section headers:
  - **System Context**: Status text (NextClientIndicator content), current time
  - **Display Controls**: Show/Hide $ toggle (with switch), Theme toggle
  - **Admin Utilities**: Keyboard shortcuts link

Items enter overflow in this exact order:
1. Status text ("No upcoming clients today")
2. Show/hide $ (becomes icon in bar at compact, full control in overflow)
3. Theme toggle (at tablet widths)

**Never overflow**: View As, Location scope, Date, Identity/Avatar, Super Admin indicator.

---

### Secondary Control Row Refactor

**File: `src/components/dashboard/CommandCenterControlRow.tsx`** (new file, ~120 lines)

Extract the control row currently duplicated at DashboardHome lines 722-749 and 792-819 into a shared component.

#### Two-Cluster Layout

```text
┌───────────────────────────────────────────────────────────┐
│  LEFT CLUSTER                │        RIGHT CLUSTER       │
│  Insights + Announcements    │  Simple/Detailed + Loc +   │
│  + Day concluded             │  Date + Sync + Customize   │
│  collapses first             │  higher priority           │
└───────────────────────────────────────────────────────────┘
```

- Right cluster: `shrink-0`, items use `min-w-0` for internal truncation
- Left cluster: At `< 1024px`, collapses into a single "Context" dropdown button (icon + "Context" label) containing Insights trigger, Announcements trigger, and Day concluded status
- Safe outer padding: inherits from parent container (px-6 mobile, px-8 desktop)
- No wrapping: `flex-nowrap overflow-hidden`

---

### Changes to `DashboardLayout.tsx`

**Lines 1195-1331** (Desktop Top Bar): Replace with:
```tsx
{!hideTopBar && (
  <SuperAdminTopBar
    sidebarCollapsed={sidebarCollapsed}
    hideFooter={hideFooter}
    headerHovered={headerHovered}
    onHeaderHoverEnd={() => hideFooter && setHeaderHovered(false)}
    filterNavItems={filterNavItems}
    // ... pass remaining props
  />
)}
```

This reduces `DashboardLayout.tsx` by ~140 lines and isolates all top bar responsive logic.

### Changes to `DashboardHome.tsx`

**Lines 722-749 and 792-819**: Replace both duplicated filter bar blocks with:
```tsx
<CommandCenterControlRow
  isLeadership={isLeadership}
  analyticsFilters={analyticsFilters}
  onLocationChange={onLocationChange}
  onDateRangeChange={onDateRangeChange}
  accessibleLocations={accessibleLocations}
  canViewAggregate={canViewAggregate}
  compact={compact}
  onCompactChange={onCompactChange}
  roleContext={{ isLeadership, hasStylistRole, isFrontDesk, isReceptionist }}
/>
```

---

### Motion Standards

All transitions follow Apple-grade timing:
- Hover states: `transition-all duration-150` (opacity/shadow only)
- Popover open/close: `data-[state=open]:animate-in data-[state=closed]:animate-out` with `fade-in-0 zoom-in-[0.98]` / `fade-out-0 zoom-out-[0.98]` over 200ms
- No bounce, no elastic, no jitter
- Search expand/collapse: `transition-[max-width] duration-200 ease-out`

---

### Technical Requirements Checklist

- `overflow-x-hidden` on top bar container (no horizontal scroll)
- `flex-nowrap` on right zone (no wrapping)
- `min-w-0` on all flex children containing text (truncation works)
- All text nodes use `truncate` class where applicable
- Content envelope: `px-6` padding inside the pill (matching current)
- `shrink-0` on right zone, `shrink` on left, `shrink-[2]` on center

---

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/SuperAdminTopBar.tsx` | New -- extracted top bar with responsive zones |
| `src/components/dashboard/TopBarOverflowMenu.tsx` | New -- glass popover overflow menu |
| `src/components/dashboard/CommandCenterControlRow.tsx` | New -- extracted secondary control row |
| `src/components/dashboard/DashboardLayout.tsx` | Modified -- replace inline top bar with `<SuperAdminTopBar />` |
| `src/pages/dashboard/DashboardHome.tsx` | Modified -- replace duplicated filter bar blocks with `<CommandCenterControlRow />` |

### What Stays the Same

- Mobile header (lines 972-1093) -- unchanged
- Sidebar -- unchanged
- All hooks, contexts, data flows -- unchanged
- Impersonation banner -- unchanged
- All existing functionality -- just restructured for responsive behavior

---

### Prompt Feedback

This is an exceptionally well-structured prompt -- the priority hierarchy with tiers, the three-zone model, and explicit breakpoint specifications make implementation deterministic. Two enhancements for next time:

1. **Phasing**: A refactor this size benefits from being split into "Phase A: extract + restructure" and "Phase B: responsive polish." This lets you validate the extraction doesn't break anything before adding progressive disclosure.

2. **Deliverable 8 (screenshots at 7 widths)**: This is a testing/QA deliverable, not a code deliverable. Calling it out separately as a verification step (rather than mixing with implementation requirements) would clarify the acceptance criteria.

