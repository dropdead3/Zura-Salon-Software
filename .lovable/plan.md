

# Fix StruggleInput Theme Contamination

## Problem

`StruggleInput.tsx` uses semantic theme tokens (`text-foreground`, `text-muted-foreground`, `prose-invert`) that resolve to the active tenant theme instead of the marketing page's hardcoded dark palette. Every other marketing component uses explicit slate/white/violet colors.

## Changes — `src/components/marketing/StruggleInput.tsx`

Replace all semantic tokens with marketing-surface colors:

| Current (broken) | Replacement |
|---|---|
| `text-foreground` (headings, feature names, strong text) | `text-white` |
| `text-muted-foreground` (body, descriptions, char counter) | `text-slate-400` |
| `text-muted-foreground/50` (placeholder) | `text-slate-500` |
| `text-muted-foreground/40` (char counter) | `text-slate-600` |
| `text-red-300` (error) | `text-red-300` (already fine) |
| `text-violet-400` (category labels, links) | `text-violet-400` (already fine) |
| `hover:text-foreground` (pills, reset) | `hover:text-white` |
| `prose-invert` on response container | Keep, but override `[&_p]:text-slate-400 [&_strong]:text-white [&_li]:text-slate-400` |

All other marketing styles (glass cards `bg-white/[0.04]`, borders `border-white/[0.08]`, violet gradients) are already correct and match the marketing surface.

**1 file modified. 0 new. 0 deleted.**

