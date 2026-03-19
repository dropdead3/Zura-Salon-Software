

# Replace Horizontal Tabs with Left-Hand Sidebar Nav in Backroom Admin

## Problem
10 tabs in a horizontal bar overflow and create a cluttered, hard-to-scan layout.

## Solution
Replace the `Tabs`/`TabsList` horizontal bar with a two-column layout: a fixed-width left sidebar nav and a content area on the right. Keep the same state-driven approach (no routing change needed).

## Implementation

### File: `src/pages/dashboard/platform/BackroomAdmin.tsx`

**Layout change:**
- Remove the `Tabs`/`TabsList`/`TabsTrigger` components
- Build a `flex` two-column layout below the page header:
  - **Left nav** (~200px): A vertical list of nav items, each with icon + label, styled with the existing platform theme variables. Active item gets `bg-violet-600 text-white`, inactive items get muted text with hover highlight. Group items into logical sections with subtle labels ("Intelligence", "Pricing", "Operations", "Products").
  - **Right content area** (`flex-1 min-w-0`): Renders the active tab's component based on state, same as today.
- Keep `useState('analytics')` for active section, wire each nav button's `onClick` to `setTab(value)`.

**Nav grouping:**
| Group | Items |
|-------|-------|
| Intelligence | Analytics |
| Pricing | Price Queue, Price Sources, Supply Library |
| Operations | App Access, Billing, Coach Performance, Refund History, Hardware Orders |
| Products | Dock App |

**Styling:** Match the platform dark theme — glass-style card for the sidebar, `hsl(var(--platform-*))` variables, violet accent for active state. The nav column gets a subtle right border.

### Files Changed
1. `src/pages/dashboard/platform/BackroomAdmin.tsx` — rewrite layout from horizontal tabs to sidebar + content

