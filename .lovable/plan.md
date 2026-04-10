

# Fix: Filter Bubble Alignment in Command Search

## Problem

The last three filter bubbles (Inventory, Tasks, Appointments) are misaligned because they use `hidden sm:inline-flex` while the first five use no explicit display class. The `inline-flex` display type renders differently than the implicit `inline-block` of standard buttons, causing vertical misalignment.

## Fix

**`src/components/command-surface/CommandSearchFilters.tsx`** — Line 32-33

Give ALL buttons a consistent `inline-flex items-center` base, and change the responsive class on the last three from `hidden sm:inline-flex` to `hidden sm:flex`:

```
// Before
'h-6 px-2.5 rounded-full text-xs font-sans font-medium transition-colors duration-150 shrink-0',
idx >= 5 && 'hidden sm:inline-flex',

// After
'h-6 px-2.5 rounded-full text-xs font-sans font-medium transition-colors duration-150 shrink-0 inline-flex items-center',
idx >= 5 && 'hidden sm:inline-flex',
```

Adding `inline-flex items-center` to the base class ensures all buttons share identical display and alignment behavior regardless of the responsive override.

| File | Change |
|------|--------|
| `src/components/command-surface/CommandSearchFilters.tsx` | Add `inline-flex items-center` to base button class |

