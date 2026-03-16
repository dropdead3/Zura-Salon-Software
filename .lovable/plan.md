

# Fix Light Mode Backgrounds Across Platform Pages

## Problem
93 files across the platform use hardcoded dark-mode colors (`bg-slate-900`, `text-slate-300`, `text-violet-400`, `border-slate-700`, etc.) that do not adapt when light mode is active. The platform CSS variables (`--platform-bg`, `--platform-foreground`, etc.) already have proper light/dark definitions in `index.css`, but components bypass them with hardcoded Tailwind classes.

## Approach: Semantic CSS Variable Classes

Rather than editing 93 files individually, we create utility classes that map to the platform CSS variables and do a systematic find-and-replace across all platform components.

### Step 1 — Add semantic Tailwind utility classes in `index.css`

Add classes that use the existing platform CSS variables so components automatically adapt:
- `text-slate-300` / `text-slate-400` → `text-[hsl(var(--platform-muted))]` or `text-[hsl(var(--platform-foreground))]`
- `bg-slate-900/50` / `bg-slate-800/50` → `bg-[hsl(var(--platform-bg-elevated))]` or `bg-[hsl(var(--platform-bg-card))]`
- `border-slate-700` → `border-[hsl(var(--platform-border))]`
- `text-white` → `text-[hsl(var(--platform-foreground))]`
- `text-violet-400` → `text-[hsl(var(--platform-primary))]`

### Step 2 — Fix the most visible pages first

Priority files (highest user-facing impact):

1. **Overview page** (`src/pages/dashboard/platform/Overview.tsx`) — hardcoded `from-white via-white to-violet-300` gradient on heading, `text-slate-400` description
2. **PlatformSidebar** — already partially adaptive but has hardcoded `bg-slate-900/95`
3. **PlatformCard / PlatformButton / PlatformLabel / PlatformInput** — base UI components used everywhere; fixing these cascades to all pages
4. **PlatformHeader** — top bar
5. **PlatformAppearanceTab** — settings page with many hardcoded slate colors
6. **InvitePlatformUserDialog**, **SetupFeesForm**, **PandaDocStatusCard** — common modals/forms

### Step 3 — Systematic replacement across remaining platform components

Replace hardcoded colors with semantic platform variables in all 93 files. Key substitutions:

| Hardcoded | Replacement |
|-----------|-------------|
| `text-white` (in platform) | `text-[hsl(var(--platform-foreground))]` |
| `text-slate-300` | `text-[hsl(var(--platform-foreground)/0.85)]` |
| `text-slate-400` | `text-[hsl(var(--platform-muted))]` |
| `text-slate-500` | `text-[hsl(var(--platform-muted)/0.7)]` |
| `text-violet-400` | `text-[hsl(var(--platform-primary))]` |
| `bg-slate-800/50` | `bg-[hsl(var(--platform-bg-card)/0.5)]` |
| `bg-slate-900/50` | `bg-[hsl(var(--platform-bg-elevated)/0.5)]` |
| `border-slate-700/50` | `border-[hsl(var(--platform-border)/0.5)]` |
| `border-slate-600` | `border-[hsl(var(--platform-border))]` |

### Step 4 — Fix conditional `isDark` patterns

Some components (like `RevenueIntelligence.tsx`, `PlatformSidebar.tsx`) already use `isDark ? 'dark-class' : 'light-class'` ternaries. These should be replaced with the single semantic variable approach, removing the conditionals entirely.

## Scope
This is a large refactor touching ~93 platform component files. The changes are mechanical (class substitutions) but numerous. Each file change is low-risk since it just swaps hardcoded colors for CSS variables that already have correct light/dark values defined.

## Technical Detail
The platform CSS variables in `index.css` (lines 1108-1200) already define both `.platform-dark` and `.platform-light` variants. The `PlatformLayout.tsx` correctly toggles `platform-dark`/`platform-light` classes based on `resolvedTheme`. The issue is purely that child components bypass these variables.

