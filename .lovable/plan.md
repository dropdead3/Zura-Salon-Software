

## Problem

The `BrowseColumn` component (used for Categories and Product Lines panels) uses **prohibited semantic classes** that resolve to light-theme colors:

- `bg-card/30`, `bg-card/60` — renders as light gray instead of dark slate
- `border-border/30`, `border-border/20`, `border-border/40` — light borders
- `text-muted-foreground`, `text-foreground` — light-theme text colors
- `bg-background` — light background on the filter input
- `bg-primary/10`, `text-primary`, `bg-muted/50` — semantic active/hover states

Per the platform design rules, these must be replaced with `--platform-*` CSS variable references.

## Changes

### `src/components/platform/backroom/BrowseColumn.tsx`

Replace all semantic classes with platform-aware equivalents:

| Current | Replacement |
|---------|-------------|
| `bg-card/30` | `bg-[hsl(var(--platform-bg-card)/0.3)]` |
| `bg-card/60` | `bg-[hsl(var(--platform-bg-card)/0.6)]` |
| `border-border/30` | `border-[hsl(var(--platform-border)/0.3)]` |
| `border-border/20` | `border-[hsl(var(--platform-border)/0.2)]` |
| `border-border/40` | `border-[hsl(var(--platform-border)/0.4)]` |
| `text-muted-foreground` | `text-[hsl(var(--platform-foreground-muted))]` |
| `text-foreground` | `text-[hsl(var(--platform-foreground))]` |
| `bg-background` | `bg-[hsl(var(--platform-bg))]` |
| `text-muted-foreground/50` | `text-[hsl(var(--platform-foreground-muted)/0.5)]` |
| `text-muted-foreground/60` | `text-[hsl(var(--platform-foreground-muted)/0.6)]` |
| `bg-primary/10` (active) | `bg-violet-500/10` |
| `text-primary` (active) | `text-violet-400` |
| `border-primary` | `border-violet-500` |
| `hover:bg-muted/50` | `hover:bg-[hsl(var(--platform-border)/0.3)]` |
| `focus:border-primary/50` | `focus:border-violet-500/50` |

This is a single-file fix — all changes are within `BrowseColumn.tsx`.

