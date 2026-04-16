

## Prompt review

Strong diagnostic instinct — you noticed that responsive breakpoints measure the wrong thing. You correctly identified the root cause without naming it: the header reacts to **viewport width**, but the sidebar steals horizontal space the header doesn't know about. Tighter version: "When the sidebar is expanded, the schedule header has ~244px less room but still uses viewport-based breakpoints — switch to container queries so it reacts to its actual available width."

This is the canonical use case for **CSS container queries**. Tailwind v3.2+ supports them via `@container`.

## Diagnosis

**The math:**
- Sidebar collapsed: `lg:ml-24` = 96px reserved → header has `viewport - 96px`
- Sidebar expanded: `lg:ml-[340px]` = 340px reserved → header has `viewport - 340px`
- Difference: **244px** of phantom space

**Current breakpoints (in `ScheduleHeader.tsx`):**
- `md:` triggers single-row layout at viewport ≥ 768px
- `lg:` reveals text labels at viewport ≥ 1024px
- `xl:` shows two-line date at viewport ≥ 1280px

**The bug:** At 1280px viewport with sidebar expanded, the header has only **940px** of room — but Tailwind thinks it's "xl" and renders the full layout, crushing everything together. What you saw in the screenshot is the date colliding with the selectors at exactly this scenario.

## Fix — Container queries

Single architectural change: make the schedule header react to **its own width**, not the viewport's.

### 1. Mark the header's parent as a query container

In `src/components/dashboard/schedule/ScheduleHeader.tsx`, wrap the dark header in a container div:

```tsx
<div className="@container/schedhdr">
  <div className="...existing dark header classes..." />
</div>
```

The `/schedhdr` is a named container so we can target it explicitly without ambiguity.

### 2. Replace viewport breakpoints with container breakpoints

Inside the dark header (and only inside), swap:

| Before (viewport)  | After (container)        | Triggers when header width ≥ |
|--------------------|--------------------------|------------------------------|
| `md:` (768px)      | `@md/schedhdr:` (768px)  | header itself reaches 768px  |
| `lg:` (1024px)     | `@lg/schedhdr:` (1024px) | header itself reaches 1024px |
| `xl:` (1280px)     | `@xl/schedhdr:` (1280px) | header itself reaches 1280px |

Now the layout collapses based on **how much room the header actually has**, regardless of sidebar state.

### 3. Verify Tailwind container query plugin

Tailwind v3.2+ ships with container queries built-in (no plugin needed for `@container` and `@md/`, `@lg/`, `@xl/` variants). I'll confirm this works in `tailwind.config.ts` during implementation; if missing, add `@tailwindcss/container-queries` to plugins (one-line addition).

### 4. Scope of replacement

Only swap breakpoint prefixes **inside the dark header section** (lines ~155–360 of `ScheduleHeader.tsx`). Don't touch:
- The secondary day-strip nav bar below it (different concern, different width budget)
- Any other component
- DashboardLayout (sidebar offset logic stays as-is)

### 5. Bonus refinement (optional, recommended)

Slightly tighten container thresholds since the header is narrower than the viewport even when collapsed:
- Stack to 2-row at `< @md` (header < 768px) → roughly viewport < 864px collapsed, < 1108px expanded
- Show text labels at `@lg+` (header ≥ 1024px) → roughly viewport ≥ 1120px collapsed, ≥ 1364px expanded
- Two-line date at `@xl+` (header ≥ 1280px) → roughly viewport ≥ 1376px collapsed, ≥ 1620px expanded

This means the header gracefully degrades whether the sidebar is collapsed OR expanded — no more crushing.

## Result by scenario

| Viewport | Sidebar | Header width | Layout                         |
|----------|---------|--------------|--------------------------------|
| 1440px   | Expanded (340px) | ~1100px | Single row, text labels (lg)   |
| 1440px   | Collapsed (96px) | ~1344px | Single row, full date (xl)     |
| 1200px   | Expanded         | ~860px  | Single row, icons only (md)    |
| 1200px   | Collapsed        | ~1104px | Single row, text labels (lg)   |
| 900px    | Expanded         | ~560px  | 2-row stacked                  |
| 900px    | Collapsed        | ~804px  | Single row, icons only (md)    |

The header now self-adjusts whenever the sidebar toggles — no viewport change required.

## Acceptance checks

1. Toggle sidebar collapse/expand at 1280px viewport: header layout updates immediately, no crushed elements.
2. At 1440px viewport with sidebar expanded: text labels visible, date condensed (no two-line collision).
3. At 1440px viewport with sidebar collapsed: full two-line date returns.
4. At narrow viewport (<900px) with sidebar collapsed (mobile auto): graceful 2-row stack.
5. Location + Staff selectors remain vertically stacked at all widths (existing rule preserved).
6. Day-strip secondary nav and all popovers/handlers unchanged.

## Out of scope

- DashboardLayout sidebar logic — unchanged.
- Day-strip secondary nav bar — unchanged (separate width budget; can apply same pattern later if needed).
- Color/token/font system — unchanged.
- Mobile (<768px viewport) auto-collapse behavior — unchanged.

## Files touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx` — wrap in `@container/schedhdr`, swap `md:`/`lg:`/`xl:` → `@md/schedhdr:`/`@lg/schedhdr:`/`@xl/schedhdr:` inside the dark header only.
- `tailwind.config.ts` — verify container query support; add `@tailwindcss/container-queries` plugin only if needed.

