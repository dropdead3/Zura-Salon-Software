

## Fix: Editor Preview Sections Not Rendering

### Root Cause

In `PageSectionRenderer.tsx` (lines 91-92), `React.lazy()` is called **inside the component's render body**:

```tsx
if (isEditorPreview) {
  const EditorSectionCard = React.lazy(() => import(...));
  const InsertionLine = React.lazy(() => import(...));
  return (...);
}
```

Every render creates a **new** lazy component reference. React treats each as a brand-new component type, which triggers `Suspense` to re-suspend immediately. Since the fallback is `null`, the sections never appear — only the Header and FooterCTA (rendered by `Layout.tsx` outside `PageSectionRenderer`) are visible.

This is a known React anti-pattern: `React.lazy()` must be called at **module level**, not inside a render function.

### Confirmed via debugging

- Network request for `website_pages` returns 200 with all 13 home sections, all enabled
- No console errors related to section rendering
- The Header, announcement bar, and FooterCTA all render (they live in `Layout.tsx`, outside the broken component)
- The empty space between the header and FooterCTA is exactly where `PageSectionRenderer` should render content

### Fix

Move the two `React.lazy()` calls from inside the component body to module-level constants at the top of the file.

#### File: `src/components/home/PageSectionRenderer.tsx`

**Before** (lines 91-92, inside component body):
```tsx
const EditorSectionCard = React.lazy(() => import('@/components/home/EditorSectionCard').then(m => ({ default: m.EditorSectionCard })));
const InsertionLine = React.lazy(() => import('@/components/home/InsertionLine').then(m => ({ default: m.InsertionLine })));
```

**After** (at module level, outside the component):
```tsx
// At top of file, after imports
const EditorSectionCard = React.lazy(() =>
  import('@/components/home/EditorSectionCard').then(m => ({ default: m.EditorSectionCard }))
);
const InsertionLine = React.lazy(() =>
  import('@/components/home/InsertionLine').then(m => ({ default: m.InsertionLine }))
);
```

Then remove the two `const` lines from inside the `if (isEditorPreview)` block.

### Files

| File | Change |
|---|---|
| `src/components/home/PageSectionRenderer.tsx` | Move `React.lazy` calls to module level |

One file, one structural move. No logic changes.

