

# Fix Platform Sidebar Section Labels — Use Termina (font-display)

## Problem

The platform sidebar section labels ("CORE", "OPERATIONS", "MONITORING", etc.) are missing `font-display`, so they render in Aeonik Pro instead of Termina. Per the design rules, all uppercase text must use `font-display` (Termina).

## Change

**File**: `src/components/platform/layout/PlatformSidebar.tsx` — Line 133

Replace:
```
text-[10px] font-medium uppercase tracking-[0.15em]
```

With:
```
font-display text-[10px] tracking-[0.12em] uppercase
```

This matches the org dashboard pattern (e.g., TopBarOverflowMenu, ColorBarProductCatalogSection) and enforces the typography rule that all uppercase text must use Termina with consistent `0.12em` tracking.

Single line change. No logic changes.

