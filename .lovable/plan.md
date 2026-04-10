

# Fix: Command Surface Section Headings — Termina, Not Aeonik Pro

## Problem

`tokens.heading.subsection` is defined as:
```
'text-xs font-medium text-muted-foreground uppercase tracking-[0.15em]'
```

It's missing `font-display`. Per the UI canon, **all uppercase text must use Termina** (`font-display`). Without it, the browser falls back to `font-sans` (Aeonik Pro), which is explicitly prohibited from being uppercase.

This token is used across all section headings in the command surface (Actions, This Evening, Recent, Navigate, Needs Attention, Top Result, etc.) and likely elsewhere in the app.

## Fix

**One line change** in `src/lib/design-tokens.ts`, line 25:

**Before:**
```
subsection: 'text-xs font-medium text-muted-foreground uppercase tracking-[0.15em]',
```

**After:**
```
subsection: 'font-display text-xs font-medium text-muted-foreground uppercase tracking-[0.15em]',
```

This fixes every usage site at once — no other files need changes since they all reference the token.

| File | Change |
|------|--------|
| `src/lib/design-tokens.ts` | Add `font-display` to `heading.subsection` token |

