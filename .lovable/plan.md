

## God Mode Bar — System-Level "View As" Redesign

### What Changes

The current `PlatformContextBanner` is an inline banner rendered **inside** `<main>` content, styled as a notification strip with rounded corners and page margins. This redesign elevates it to a **parent container layer** that wraps the entire dashboard shell, creating a visible "God Mode" system state.

### Architecture

```text
CURRENT:
┌─────────────────────────────────────┐
│  Sidebar  │  TopBar                 │
│           │  PlatformContextBanner  │  ← inside <main>, scrollable
│           │  IncidentBanner         │
│           │  Page Content           │
└─────────────────────────────────────┘

NEW:
┌═══════════════════════════════════════════┐
║  GOD MODE BAR (fixed, full viewport)      ║  ← above everything
╚═══════════════════════════════════════════╝
┌─────────────────────────────────────┐
│  Sidebar  │  TopBar                 │  ← pushed down by bar height
│           │  Page Content           │
└─────────────────────────────────────┘
```

### Files to Create / Modify

**1. New: `src/components/dashboard/GodModeBar.tsx`**

A new fixed-position, full-viewport-width bar component:

- **Position**: `fixed top-0 left-0 right-0 z-[60]` — above sidebar (z-50), above top bar (z-30)
- **Height**: 44px desktop, 40px mobile — slightly taller than a standard nav element
- **Visual design**: Deep violet-to-purple gradient background (`bg-gradient-to-r from-violet-950 via-purple-900 to-violet-950`), subtle bottom glow line (`border-b border-violet-500/40`), very subtle inner shine
- **Left side**: Shield icon + "GOD MODE" label (font-display, uppercase, tracking-wide) + separator + "Viewing as: {org name}" with slug in muted text
- **Right side**: "Account Details" ghost button + "Exit View" primary button (visually dominant — solid violet/gold with hover emphasis)
- **Animation**: Slides in from top using `framer-motion` (`animate={{ y: 0 }}` from `initial={{ y: -60 }}`), spring physics matching platform standards (damping: 26, stiffness: 300)
- **Mobile**: Stacks to two rows if needed; "Exit View" always visible and full-touch-target sized (44px min height)
- **Escape key**: Already handled by ViewAsContext — no change needed

**2. New: `src/components/dashboard/GodModeOverlay.tsx`**

A subtle global tint overlay that signals the user is in an elevated state:

- A `pointer-events-none` overlay with `fixed inset-0 z-[55]` (between bar and content)
- Applies a faint violet border glow: `ring-2 ring-inset ring-violet-500/10` on the app container
- Alternatively: a CSS class `god-mode-active` on the root `<div>` that applies a subtle `box-shadow: inset 0 0 100px rgba(139, 92, 246, 0.03)` 
- Very subtle — just enough to feel "not normal mode"

**3. Modify: `src/components/dashboard/DashboardLayout.tsx`**

- **Import** `GodModeBar` 
- **Render** `<GodModeBar />` as the **first child** of the outermost `<div>`, before sidebar and main — it's fixed-position so it doesn't affect flow
- **Add padding-top** to the outermost container: when God Mode is active (`isImpersonating`), add `pt-[44px]` to push the entire app down below the bar
- **Remove** the inline `<PlatformContextBanner />` from inside `<main>` (line 531)
- **Add** subtle god-mode class to the root div when active (for the global tint effect)

**4. Modify: `src/index.css` (or tailwind layer)**

- Add a `.god-mode-active` utility class with the subtle inset box-shadow for the global tint effect

**5. Keep: `PlatformContextBanner.tsx`**

- Leave the file in place but it will no longer be rendered from DashboardLayout. Can be cleaned up later.

### Content Structure (God Mode Bar)

```text
Desktop:
┌──────────────────────────────────────────────────────────────────────┐
│ 🛡 GOD MODE  │  Viewing as: Drop Dead Salons (drop-dead-salons)    │  [Account Details]  [■ EXIT VIEW] │
└──────────────────────────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────────────┐
│ 🛡 Viewing as: Drop Dead Salons │
│              [■ EXIT VIEW]       │
└──────────────────────────────────┘
```

### Visual Specs

| Property | Value |
|---|---|
| Background | `bg-gradient-to-r from-violet-950 via-purple-900 to-violet-950` |
| Bottom border | `border-b border-violet-500/40` with subtle glow shadow |
| Typography | font-display for "GOD MODE", font-sans for org name |
| Exit button | Solid fill: `bg-violet-500 hover:bg-violet-400 text-white` — largest, most visible control |
| Account Details | Ghost: `text-violet-300 hover:text-white` |
| Height | 44px desktop, 40px mobile |
| z-index | 60 (above sidebar at 50, above top bar at 30) |

### Transition Behavior

- **Enter**: Bar slides down from `-60px` with spring animation (180-240ms feel). App container smoothly gains `pt-[44px]` via CSS transition on padding.
- **Exit**: Bar slides up and fades. App padding transitions back to 0. Instant state reset via `clearSelection()`.

### What Stays the Same

- `ViewAsContext` and `ViewAsPopover` — unchanged (these handle role-based "View As" within the org)
- `useOrganizationContext` impersonation state — unchanged (this drives the God Mode bar visibility)
- Escape key shortcut — already works
- Audit logging — already works

### Scope Clarification

This redesign targets the **organization-level impersonation** (platform user viewing as an org) driven by `useOrganizationContext().isImpersonating`. The role-based "View As" within an org (ViewAsPopover) is a separate system and not part of this change.

