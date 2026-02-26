

## Fix Gallery Manager Inspector Overflow

### Problems Visible in Screenshot

1. **Action buttons overflow** — "Bulk Upload" and "Add Image" buttons with text labels sit side-by-side in `flex justify-end gap-2` (line 246), pushing past the ~290px panel edge. Combined they are ~280px+ which leaves no margin.

2. **Empty state card too wide** — The empty state `Card` with `p-8` and centered icon/text appears to bleed into the right edge of the inspector panel. The parent `EditorCard` content area is only ~260px wide after padding.

3. **Stats cards have generous padding** — The stat cards use `p-3` which is fine, but the overall `grid-cols-1 gap-3` could be tightened.

### Changes

#### 1. `GalleryContent.tsx` — Stack action buttons vertically
Change the button container from horizontal `flex justify-end gap-2` to `flex flex-col gap-2` with full-width buttons. This prevents horizontal overflow entirely:

```tsx
<div className="flex flex-col gap-2">
  <Button variant="outline" className="gap-2 w-full">
    <Upload /> Bulk Upload
  </Button>
  <Button className="gap-2 w-full">
    <Plus /> Add Image
  </Button>
</div>
```

Same for the "Add Before/After" button container on line 346.

#### 2. `GalleryContent.tsx` — Compact empty state padding
Reduce the empty state `p-8` to `p-6` so it fits the narrow panel without bleeding.

#### 3. `GalleryContent.tsx` — Add `overflow-hidden` to EditorCard wrapper
The parent content area needs to clip any children that try to exceed its bounds. Add `overflow-hidden` to the root element.

### Files Modified

| File | Change |
|------|--------|
| `GalleryContent.tsx` | Stack action buttons vertically with `w-full`, reduce empty state padding to `p-6`, add overflow containment |

