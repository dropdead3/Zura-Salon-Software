

## Plan: Replace Loading Spinners with Branded PixelZMark Disco Loader

Great instinct to brand the loading experience — this is exactly the kind of detail that makes a platform feel premium and intentional. The PixelZMark disco Z is a perfect fit for a loading indicator.

### Approach

Rather than touching all 363 files that use `Loader2`, we'll create a drop-in `ZuraLoader` component and then progressively adopt it. The component will be a smaller version of `PixelZMark` sized appropriately for inline and full-page loading contexts.

### 1. Create `src/components/ui/ZuraLoader.tsx`

A new component that renders a scaled-down `PixelZMark` with size variants:

- **`sm`** — for inline/button contexts (replaces `w-4 h-4` spinners). ~20px grid using `h-2 w-2` cells with `gap-0.5`.
- **`md`** (default) — for card/section loading (replaces `w-6 h-6` spinners). ~28px grid using `h-2.5 w-2.5` cells with `gap-0.5`.
- **`lg`** — for full-page loading (replaces `h-8 w-8` spinners). ~40px grid using `h-3.5 w-3.5` cells with `gap-1`.

The disco shimmer animation from `PixelZMark` carries over directly. Accepts `className` for additional styling.

### 2. Update `tokens.loading.spinner` in `design-tokens.ts`

Update the comment to reference `ZuraLoader` as the canonical loading component. The token class string stays as a fallback but the component becomes the standard.

### 3. Replace key high-visibility loading states

Swap `Loader2` for `ZuraLoader` in the most visible locations first:

- **Full-page loaders** — pages like `GoalsTabContent`, `AssistantSchedule`, `ProgramEditor`, etc. that show a centered spinner while data loads.
- **`tokens.loading.spinner` usages** — the ~12 files using the design token spinner pattern.
- **Dashboard loading states** — any loading state a user sees on initial page load.

Inline button spinners (e.g., "Save" button loading) will keep `Loader2` since the Z mark would be too complex at that tiny size.

### Technical detail

```tsx
// src/components/ui/ZuraLoader.tsx
const SIZES = {
  sm: { cell: 'h-2 w-2 rounded-[2px]', gap: 'gap-0.5' },
  md: { cell: 'h-2.5 w-2.5 rounded-[3px]', gap: 'gap-0.5' },
  lg: { cell: 'h-3.5 w-3.5 rounded-[4px]', gap: 'gap-1' },
};

export function ZuraLoader({ size = 'md', className }) {
  // Same cells grid and disco animation as PixelZMark
  // but with configurable cell sizes
}
```

**Files to create**: `src/components/ui/ZuraLoader.tsx`
**Files to modify**: ~12-15 high-visibility loading state files (full-page and section loaders)

