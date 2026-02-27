

## Problem

In **Edit mode** (`mode=edit`), the canvas renders sections inside `EditorSectionCard` bento cards stacked vertically with `space-y-5`. The `HeroSection` uses `min-h-screen` (100vh of the iframe), creating a massive card that pushes all other sections far below the fold. The hero content starts at `pt-28` from the top of that enormous card — the user sees mostly blank space, then has to scroll past the full-viewport-height hero card to reach other sections. This makes the editor appear "stuck."

In **Preview/View mode** (`mode=view`), sections render without bento card wrappers, full-height is expected, and everything works.

## Fix

**File: `src/components/home/HeroSection.tsx`** (line 84)

When `isPreview` is true (editor iframe), replace `min-h-screen` with a constrained height (`min-h-[600px]`) and reduce vertical padding. This gives a reasonable card-sized preview without the full-viewport blank space.

```tsx
// Line 84 — conditional class
className={cn(
  "relative flex flex-col overflow-hidden",
  isPreview ? "min-h-[600px]" : "min-h-screen"
)}
```

Also reduce the excessive padding that creates blank space in preview:
```tsx
// Line 143 — conditional padding
className={cn(
  "flex-1 flex items-start justify-center relative z-0",
  isPreview ? "pt-16 pb-16" : "pt-28 pb-32 lg:pt-36 lg:pb-48"
)}
```

Two lines changed, one file. Edit mode shows a compact, visible hero preview. Public site is unaffected.

