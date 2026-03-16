

# Fix Invoice Preview Card — Platform Design Compliance

## Problem
The Invoice Preview card uses **semantic light-theme classes** (`text-foreground`, `text-muted-foreground`, `border-border`, `bg-card/50`, `bg-primary/10`) which resolve to light-mode colors instead of the platform's dark-themed CSS variables, causing the card interior to look out of place.

## Changes — Single File

**`src/components/platform/billing/InvoicePreview.tsx`**

Replace all prohibited semantic classes with platform CSS variable equivalents:

| Current (prohibited) | Replacement |
|---|---|
| `text-foreground` | `text-[hsl(var(--platform-foreground))]` |
| `text-muted-foreground` | `text-[hsl(var(--platform-foreground-muted))]` |
| `border-border` | `border-[hsl(var(--platform-border)/0.5)]` |
| `border-border/50` | `border-[hsl(var(--platform-border)/0.3)]` |
| `bg-card/50` | `bg-[hsl(var(--platform-bg-card)/0.5)]` |
| `bg-primary/10 border border-primary/30` | `bg-violet-500/10 border border-violet-500/30` |
| `text-primary` | `text-violet-400` |
| `text-primary/70` | `text-violet-400/70` |
| `font-medium` on total | `font-medium` (kept, within 500 limit) |

This is a class-swap-only change across ~15 lines in a single file. No logic or structure changes.

