

## Luxury Skeleton Loaders for Website Editor

### Approach

Create a single `EditorSkeletons.tsx` file containing three skeleton components (Structure, Canvas, Inspector) that match the exact dimensions and glass styling of the real panels. Wire them into `WebsiteSectionsHub.tsx` using the existing `isLoading` state from `useWebsiteSections` and `useWebsitePages`.

The animation uses a subtle opacity pulse (1.0 → 0.94 → 1.0, 2s duration) via a custom Tailwind animation -- no shimmer gradients.

---

### Technical Details

#### New file: `src/components/dashboard/website-editor/EditorSkeletons.tsx`

Three exported components:

**`StructurePanelSkeleton`**
- Glass container matching `editorTokens.panel.structure`
- Segmented control placeholder (3 pill shapes in `bg-muted/60` container)
- Search bar placeholder
- 8 rows: each with a 20px circle + text bar (60-80% width, varying), correct 8px vertical gap
- Row indentation for 2-3 rows to simulate hierarchy

**`CanvasPanelSkeleton`**
- Glass container matching `editorTokens.panel.canvas`
- Header strip matching `editorTokens.canvas.controlStrip` with placeholder blocks for back button, site name, viewport toggle, action buttons
- 4 floating section card skeletons inside the canvas area:
  - Card 1 (Hero): tall (200px), full-width title bar (65%), subtitle bar (45%), pill button shape
  - Card 2 (Text): medium (120px), 4 text bars of varying widths
  - Card 3 (Gallery): medium (140px), 3 rectangular image placeholders in a row
  - Card 4 (CTA): short (80px), centered title bar + button pill
- Cards use `rounded-[20px]`, `bg-card/80`, `border-border/30` -- matching `EditorSectionCard`
- Vertical spacing: `space-y-5` matching the real layout

**`InspectorPanelSkeleton`**
- Glass container matching `editorTokens.panel.inspector`
- Header bar placeholder
- 3 collapsible group sections, each with:
  - Group header bar (uppercase-width placeholder)
  - 2-3 input field rows (label bar + input rectangle)
  - 1 toggle switch placeholder
- 32px group spacing, 16px field spacing

All skeleton shapes use `bg-muted/60 rounded-md` with the custom pulse animation.

#### Custom animation (added to `tailwind.config.ts`):

```
"skeleton-pulse": "skeleton-pulse 2s ease-in-out infinite"
```
Keyframes: `0%,100% { opacity: 1 } 50% { opacity: 0.94 }`

#### Modified: `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`

Add loading gate near the top of the render:

```typescript
const { data: sectionsConfig, isLoading: sectionsLoading } = useWebsiteSections();
const { data: pagesConfig, isLoading: pagesLoading } = useWebsitePages();
const isEditorLoading = sectionsLoading || pagesLoading;
```

When `isEditorLoading` is true, render the skeleton shell instead of real panels:

```tsx
{isEditorLoading ? (
  <>
    <StructurePanelSkeleton width={layout.structureWidth} visible={layout.structureVisible} />
    <CanvasPanelSkeleton />
    <InspectorPanelSkeleton width={layout.inspectorWidth} visible={layout.inspectorVisible} />
  </>
) : (
  // existing panel rendering
)}
```

Skeleton panels accept `width` and `visible` props to match the layout manager's computed sizes, ensuring zero layout shift when content resolves.

Content crossfade: wrap the real panels in a `motion.div` with `initial={{ opacity: 0 }}` and `animate={{ opacity: 1 }}` over 200ms when loading completes.

---

### Files Summary

| Action | File |
|---|---|
| Create | `src/components/dashboard/website-editor/EditorSkeletons.tsx` |
| Modify | `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` |
| Modify | `tailwind.config.ts` (add skeleton-pulse keyframe) |

No public site files modified. No database changes.

